import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  positionAdded,
  subjectAdded,
  subjectDeleted,
  positionEdited,
  subjectEdited,
  subjectLinked,
  livePositions,
  positionMergedInto,
  replaySubject,
  subjectThemesSet,
  subjectStream,
  subjectUnlinked,
} from '../../domain/aggregates/subject'
import { decodeSubjectEvent, SubjectEvent } from '../../domain/aggregates/subject-events'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/**
 * Runs against the local database (`npm run test:db`), on rows the seed
 * provides: a contributor, two themes and another subject to link to.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const subjectId = crypto.randomUUID()
const stream = subjectStream(subjectId)
const pourId = crypto.randomUUID()
const contreId = crypto.randomUUID()
let actorId = ''
let themeIds: string[] = []
let otherSubjectId = ''

const append = (revision: number, events: SubjectEvent[]) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('subject projector', () => {
  beforeAll(async () => {
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    themeIds = (await prisma().themes.findMany({ select: { id: true }, take: 2 })).map((t) => t.id)
    otherSubjectId = (await prisma().subjects.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().related_subjects.deleteMany({
      where: { OR: [{ subject_id_1: subjectId }, { subject_id_2: subjectId }] },
    })
    await prisma().subjects.deleteMany({ where: { id: subjectId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'subject', stream_id: subjectId },
    })
    await prisma().$disconnect()
  })

  it('writes the subject and its positions', async () => {
    await append(0, [
      subjectAdded({
        title: 'Un sujet de test',
        presentation: 'Une présentation suffisamment longue.',
        problem: 'Une problématique suffisamment longue ?',
      }),
      positionAdded({
        positionId: pourId,
        title: 'Pour',
        description: 'Une description suffisamment longue.',
      }),
      positionAdded({
        positionId: contreId,
        title: 'Contre',
        description: 'Une autre description longue.',
      }),
    ])

    const row = await prisma().subjects.findUniqueOrThrow({
      where: { id: subjectId },
      include: { positions: { orderBy: { title: 'asc' } } },
    })
    expect(row).toMatchObject({ slug: 'un-sujet-de-test', created_by: actorId })
    expect(row.positions.map((p) => [p.id, p.slug, p.created_by])).toEqual([
      [contreId, 'contre', actorId],
      [pourId, 'pour', actorId],
    ])
  })

  it('edits the subject and a position', async () => {
    await append(3, [
      subjectEdited({
        title: 'Un sujet renommé',
        presentation: 'Une présentation suffisamment longue.',
        problem: 'Une problématique suffisamment longue ?',
      }),
      positionEdited({
        positionId: pourId,
        title: 'Plutôt pour',
        description: 'Une description suffisamment longue.',
      }),
    ])

    const row = await prisma().subjects.findUniqueOrThrow({ where: { id: subjectId } })
    const position = await prisma().positions.findUniqueOrThrow({ where: { id: pourId } })
    expect(row.slug).toBe('un-sujet-renomme')
    expect(position).toMatchObject({ title: 'Plutôt pour', slug: 'plutot-pour' })
  })

  it('sets the themes, then replaces them, keeping one primary', async () => {
    await append(5, [subjectThemesSet([{ themeId: themeIds[0], isPrimary: true }])])
    await append(6, [
      subjectThemesSet([
        { themeId: themeIds[1], isPrimary: true },
        { themeId: themeIds[0], isPrimary: false },
      ]),
    ])

    const links = await prisma().subject_themes.findMany({
      where: { subject_id: subjectId },
      orderBy: { is_primary: 'desc' },
    })
    expect(links.map((l) => [l.theme_id, l.is_primary])).toEqual([
      [themeIds[1], true],
      [themeIds[0], false],
    ])
  })

  it('links to another subject once, then unlinks', async () => {
    await append(7, [subjectLinked(otherSubjectId)])

    const pair = [subjectId, otherSubjectId].sort()
    const linked = await prisma().related_subjects.findMany({
      where: { subject_id_1: pair[0], subject_id_2: pair[1] },
    })
    expect(linked).toHaveLength(1)

    await append(8, [subjectUnlinked(otherSubjectId)])
    const unlinked = await prisma().related_subjects.findMany({
      where: { subject_id_1: pair[0], subject_id_2: pair[1] },
    })
    expect(unlinked).toHaveLength(0)
  })

  it('merges a position away and deletes the subject with its positions', async () => {
    await append(9, [positionMergedInto(contreId, pourId)])
    const merged = await prisma().positions.findUniqueOrThrow({ where: { id: contreId } })
    expect(merged.deleted_at).not.toBeNull()

    await append(10, [subjectDeleted()])
    const subject = await prisma().subjects.findUniqueOrThrow({ where: { id: subjectId } })
    const pour = await prisma().positions.findUniqueOrThrow({ where: { id: pourId } })
    expect(subject.deleted_at).not.toBeNull()
    expect(pour.deleted_at).not.toBeNull()
  })

  it('rebuilds from the journal what the tables hold', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replaySubject(history)
    expect(Either.isRight(state) && state.right).toMatchObject({
      subject: { slug: 'un-sujet-renomme', createdBy: actorId },
      themes: [
        { themeId: themeIds[1], isPrimary: true },
        { themeId: themeIds[0], isPrimary: false },
      ],
      relatedSubjectIds: [],
    })
    expect(Either.isRight(state) && state.right ? livePositions(state.right) : []).toEqual([])
  })
})

describe.skipIf(!hasDatabase)('subject journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every subject in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM subjects s
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e WHERE e.stream_type = 'subject' AND e.stream_id = s.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('decodes every subject event the backfill wrote', async () => {
    const events = await prisma().domain_events.findMany({ where: { stream_type: 'subject' } })
    const unreadable = events
      .map((row) =>
        decodeSubjectEvent({
          type: row.type,
          payload: row.payload,
          streamType: row.stream_type,
          streamId: row.stream_id,
          revision: row.revision,
          actorId: row.actor_id,
          metadata: row.metadata as Record<string, unknown>,
          occurredAt: row.occurred_at,
        }),
      )
      .filter(Either.isLeft)
    expect(unreadable.map((e) => e.left.message)).toEqual([])
    expect(events.length).toBeGreaterThan(0)
  })

  it('replays every imported subject to what its rows hold', async () => {
    const rows = await prisma().subjects.findMany({
      where: { deleted_at: null },
      include: { positions: { where: { deleted_at: null }, select: { id: true, slug: true } } },
    })
    for (const row of rows) {
      // Prisma reads the partial unique index on subject_themes as a one-to-one: query the links apart
      const themeLinks = await prisma().subject_themes.findMany({
        where: { subject_id: row.id },
        select: { theme_id: true, is_primary: true },
      })
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(subjectStream(row.id))),
      )
      const state = replaySubject(history)
      if (Either.isLeft(state) || !state.right) throw new Error(`No state for subject ${row.id}`)
      expect(state.right.subject).toMatchObject({
        title: row.title,
        slug: row.slug,
        presentation: row.presentation,
        problem: row.problem,
        createdBy: row.created_by ?? undefined,
      })
      expect(
        livePositions(state.right)
          .map((p) => p.id)
          .sort(),
      ).toEqual(row.positions.map((p) => p.id).sort())
      expect([...state.right.themes].sort((a, b) => a.themeId.localeCompare(b.themeId))).toEqual(
        themeLinks
          .map((t) => ({ themeId: t.theme_id, isPrimary: t.is_primary }))
          .sort((a, b) => a.themeId.localeCompare(b.themeId)),
      )
    }
  })
})
