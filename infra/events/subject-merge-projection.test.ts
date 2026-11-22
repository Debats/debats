import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  positionAdded,
  subjectAdded,
  subjectLinked,
  subjectStream,
  subjectThemesSet,
} from '../../domain/aggregates/subject'
import { SubjectEvent } from '../../domain/aggregates/subject-events'
import { statementAdded, statementStream } from '../../domain/aggregates/statement'
import { declarationContent, publicFigureAuthor } from '../../domain/entities/statement'
import { mergeSubjectsUseCase } from '../../domain/use-cases/merge-subjects'
import { runLive } from '../live-services'
import { getPrismaClient } from '../prisma/client'
import { findSubjectSuccessorSlug } from '../queries/subject-successor'
import { createAdminSupabaseClient } from '../supabase/admin'
import { runUnitOfWork } from './unit-of-work'

/**
 * A subject merged into another by the command itself, in its transaction,
 * as the subject and statement projectors leave the tables. Runs against the
 * local database (`npm run test:db`), on subjects of its own and on rows the
 * seed provides: a contributor, a public figure and two themes.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const keptId = crypto.randomUUID()
const absorbedId = crypto.randomUUID()
const neighbourId = crypto.randomUUID()
const pourId = crypto.randomUUID()
const favorableId = crypto.randomUUID()
const gelId = crypto.randomUUID()
const foldedStatementId = crypto.randomUUID()
const carriedStatementId = crypto.randomUUID()
const subjectIds = [keptId, absorbedId, neighbourId]
const statementIds = [foldedStatementId, carriedStatementId]
const tag = keptId.slice(0, 8)
let actorId = ''
let figureId = ''
let themeIds: string[] = []
let carriedUpdatedAt: Date | null = null

const onSubject = (subjectId: string, revision: number, events: SubjectEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) =>
      journal.append(subjectStream(subjectId), revision, events, { actorId }),
    ),
  )

const subject = (name: string) =>
  subjectAdded({
    title: `Sujet ${name} ${tag}`,
    presentation: 'Une présentation suffisamment longue.',
    problem: 'Une problématique suffisamment longue ?',
  })

const position = (positionId: string, title: string) =>
  positionAdded({ positionId, title, description: 'Une description suffisamment longue.' })

const addStatementOn = (statementId: string, positionId: string) =>
  Effect.runPromise(
    runUnitOfWork((journal) =>
      journal.append(
        statementStream(statementId),
        0,
        [
          statementAdded({
            author: publicFigureAuthor(figureId),
            subjectId: absorbedId,
            positionId,
            content: declarationContent('Une citation suffisamment longue pour être valide.'),
            sourceName: 'Le Monde',
            sourceUrl: 'https://lemonde.fr/article',
            statedAt: new Date('2024-01-15'),
            argumentIds: [],
          }),
        ],
        { actorId },
      ),
    ),
  )

const foldedDraftId = crypto.randomUUID()
const carriedDraftId = crypto.randomUUID()
const validatedDraftId = crypto.randomUUID()
const otherDraftId = crypto.randomUUID()
const draftIds = [foldedDraftId, carriedDraftId, validatedDraftId, otherDraftId]

const draft = (id: string, subjectTitle: string, positionTitle: string, status: string) => ({
  id,
  subject_title: subjectTitle,
  position_title: positionTitle,
  status,
  public_figure_name: 'Une personnalité',
  quote: 'Une citation suffisamment longue pour être valide.',
  source_name: 'Le Monde',
  source_url: 'https://lemonde.fr/article',
  date: new Date('2024-01-15'),
  origin: `test ${tag}`,
})

describe.skipIf(!hasDatabase)('a subject merged into another, in the tables', () => {
  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    figureId = (await prisma().public_figures.findFirstOrThrow({ select: { id: true } })).id
    themeIds = (await prisma().themes.findMany({ select: { id: true }, take: 2 })).map((t) => t.id)

    await onSubject(neighbourId, 0, [subject('voisin')])
    await onSubject(keptId, 0, [
      subject('conservé'),
      position(pourId, 'Pour'),
      subjectThemesSet([{ themeId: themeIds[0], isPrimary: true }]),
    ])
    await onSubject(absorbedId, 0, [
      subject('absorbé'),
      position(favorableId, 'Favorable'),
      position(gelId, 'Pour un gel'),
      subjectThemesSet([{ themeId: themeIds[1], isPrimary: true }]),
      subjectLinked(neighbourId),
      subjectLinked(keptId),
    ])
    await onSubject(neighbourId, 1, [subjectLinked(absorbedId)])
    await onSubject(keptId, 3, [subjectLinked(absorbedId)])
    await addStatementOn(foldedStatementId, favorableId)
    await addStatementOn(carriedStatementId, gelId)
    carriedUpdatedAt = (
      await prisma().statements.findUniqueOrThrow({ where: { id: carriedStatementId } })
    ).updated_at
    // Drafts name their subject and their position; a subject is found whatever the case of its title
    await prisma().draft_statements.createMany({
      data: [
        draft(foldedDraftId, `sujet absorbé ${tag}`, 'Favorable', 'pending'),
        draft(carriedDraftId, `Sujet absorbé ${tag}`, 'Pour un gel', 'revision_requested'),
        draft(validatedDraftId, `Sujet absorbé ${tag}`, 'Favorable', 'validated'),
        draft(otherDraftId, `Sujet voisin ${tag}`, 'Favorable', 'pending'),
      ],
    })
  })

  afterAll(async () => {
    await prisma().draft_statements.deleteMany({ where: { id: { in: draftIds } } })
    await prisma().statements.deleteMany({ where: { id: { in: statementIds } } })
    await prisma().related_subjects.deleteMany({
      where: { OR: [{ subject_id_1: { in: subjectIds } }, { subject_id_2: { in: subjectIds } }] },
    })
    // The absorbed subject points at the kept one: it goes first
    for (const id of [absorbedId, keptId, neighbourId]) {
      await prisma().subjects.deleteMany({ where: { id } })
    }
    await prisma().domain_events.deleteMany({
      where: {
        OR: [
          { stream_type: 'subject', stream_id: { in: subjectIds } },
          { stream_type: 'statement', stream_id: { in: statementIds } },
          { stream_type: 'review', stream_id: { in: [absorbedId, favorableId] } },
        ],
      },
    })
    await prisma().$disconnect()
  })

  it('is merged by the command, in one transaction', async () => {
    const result = await runLive(
      mergeSubjectsUseCase({
        contributor: { id: actorId, reputation: 10_000 },
        sourceSubjectId: absorbedId,
        sourceRevision: 6,
        targetSubjectId: keptId,
        targetRevision: 4,
        positions: [{ positionId: favorableId, into: pourId }, { positionId: gelId }],
      }),
    )

    expect(Either.isRight(result) && result.right.id).toBe(keptId)
  })

  it('remembers where the subject went, and its old address leads there', async () => {
    const absorbed = await prisma().subjects.findUniqueOrThrow({ where: { id: absorbedId } })
    expect(absorbed.merged_into_id).toBe(keptId)
    expect(absorbed.deleted_at).not.toBeNull()

    const kept = await prisma().subjects.findUniqueOrThrow({ where: { id: keptId } })
    expect(kept.deleted_at).toBeNull()
    expect(
      await Effect.runPromise(findSubjectSuccessorSlug(createAdminSupabaseClient(), absorbed.slug)),
    ).toBe(kept.slug)
  })

  it('moves the positions carried over and folds the others away', async () => {
    const positions = await prisma().positions.findMany({
      where: { id: { in: [pourId, favorableId, gelId] } },
      orderBy: { title: 'asc' },
    })
    expect(positions.map((p) => [p.title, p.subject_id, p.deleted_at === null])).toEqual([
      ['Favorable', absorbedId, false],
      ['Pour', keptId, true],
      ['Pour un gel', keptId, true],
    ])
  })

  it('hands over the themes the kept subject lacked, its primary one unchanged', async () => {
    const themes = await prisma().subject_themes.findMany({
      where: { subject_id: keptId },
      orderBy: { is_primary: 'desc' },
    })
    expect(themes.map((t) => [t.theme_id, t.is_primary])).toEqual([
      [themeIds[0], true],
      [themeIds[1], false],
    ])
  })

  it('leaves no link to the subject that disappeared, and hands its links over', async () => {
    const links = await prisma().related_subjects.findMany({
      where: { OR: [{ subject_id_1: { in: subjectIds } }, { subject_id_2: { in: subjectIds } }] },
    })
    expect(links.map((l) => [l.subject_id_1, l.subject_id_2])).toEqual([
      [keptId, neighbourId].sort(),
    ])
  })

  it('moves a statement to the position its own was folded into, and leaves one carried over untouched', async () => {
    const folded = await prisma().statements.findUniqueOrThrow({
      where: { id: foldedStatementId },
    })
    const carried = await prisma().statements.findUniqueOrThrow({
      where: { id: carriedStatementId },
    })
    expect(folded.position_id).toBe(pourId)
    expect(folded.updated_at).not.toEqual(folded.created_at)
    // Its position came along: nothing of the row changed, so it is not "modified"
    expect(carried.position_id).toBe(gelId)
    expect(carried.updated_at).toEqual(carriedUpdatedAt)
  })

  it('leads the drafts still to review to the subject that remains, and to the position theirs was folded into', async () => {
    const drafts = await prisma().draft_statements.findMany({ where: { id: { in: draftIds } } })
    const told = (id: string) => {
      const found = drafts.find((d) => d.id === id)
      return [found?.subject_title, found?.position_title]
    }
    expect(told(foldedDraftId)).toEqual([`Sujet conservé ${tag}`, 'Pour'])
    expect(told(carriedDraftId)).toEqual([`Sujet conservé ${tag}`, 'Pour un gel'])
    // What was validated tells what was read then; another subject is none of the merge's business
    expect(told(validatedDraftId)).toEqual([`Sujet absorbé ${tag}`, 'Favorable'])
    expect(told(otherDraftId)).toEqual([`Sujet voisin ${tag}`, 'Favorable'])
  })
})
