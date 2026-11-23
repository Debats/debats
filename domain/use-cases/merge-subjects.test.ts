import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer } from 'effect'
import { mergeSubjectsUseCase } from './merge-subjects'
import {
  jointDeclarationPublished,
  jointDeclarationStream,
  positionTaken,
  replayJointDeclaration,
} from '../aggregates/joint-declaration'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { fakeJointDeclarationRepo, sampleJointDeclaration } from './joint-declaration-test-helpers'
import { createStatement } from '../entities/entity-test-helpers'
import { declarationContent, publicFigureAuthor } from '../entities/statement'
import { StatementRepository } from '../repositories/statement-repository'
import { statementAdded, statementStream } from '../aggregates/statement'
import {
  POSITIONS_UNSETTLED,
  subjectLinked,
  subjectStream,
  subjectThemesSet,
} from '../aggregates/subject'
import { SubjectEvent } from '../aggregates/subject-events'
import { RunUnitOfWork } from '../events/unit-of-work'
import { runWith } from './command-test-helpers'
import { EDITED_MEANWHILE } from './run-command'
import { journalWithSubjects, samplePosition, sampleSubject } from './subject-test-helpers'

const kept = sampleSubject('Le montant du SMIC')
const pour = samplePosition(kept.id, 'Pour une hausse')
const contre = samplePosition(kept.id, 'Contre une hausse')

const duplicate = sampleSubject('Le SMIC')
const favorable = samplePosition(duplicate.id, 'Favorable à une hausse')
const gel = samplePosition(duplicate.id, 'Pour un gel')

const neighbour = sampleSubject('Les retraites')

const statementOn = (positionId: string) =>
  createStatement({
    author: publicFigureAuthor('figure-1'),
    positionId,
    content: declarationContent('Une citation suffisamment longue pour être valide.'),
    sourceName: 'Le Monde',
    sourceUrl: 'https://lemonde.fr/article',
    statedAt: new Date('2024-01-15'),
    createdBy: 'author-id',
  })

const onFavorable = statementOn(favorable.id)
const onGel = statementOn(gel.id)

const idealist = { id: 'idealist', reputation: 10_000 }

const manifesto = sampleJointDeclaration()

/**
 * The read side: the statements standing on the subject that disappears, and
 * the joint declarations that engage each subject, by subject id
 */
const fakes = (statementIds: string[] = [], engaging: Record<string, string[]> = {}) =>
  Layer.merge(
    Layer.succeed(StatementRepository, {
      findIdsBySubjectId: () => Effect.succeed(statementIds),
    } as unknown as StatementRepository),
    Layer.succeed(JointDeclarationRepository, fakeJointDeclarationRepo([manifesto], engaging)),
  )

/** Both subjects as the merge page showed them: two positions each, nothing else written */
const merge = {
  contributor: idealist,
  sourceSubjectId: duplicate.id,
  targetSubjectId: kept.id,
  sourceRevision: 3,
  targetRevision: 3,
  positions: [{ positionId: favorable.id, into: pour.id }, { positionId: gel.id }],
}

const bothSubjects = () =>
  journalWithSubjects([kept, [pour, contre]], [duplicate, [favorable, gel]], [neighbour, []])

type Journal = Awaited<ReturnType<typeof bothSubjects>>['journal']

const written = (journal: Journal, after: number) =>
  journal
    .all()
    .slice(after)
    .map((e) => [e.streamType, e.streamId, e.type])

async function appendTo(journal: Journal, subjectId: string, at: number, events: SubjectEvent[]) {
  await Effect.runPromise(
    journal.append(subjectStream(subjectId), at, events, { actorId: 'founder' }),
  )
}

async function seedStatements(journal: Journal) {
  for (const statement of [onFavorable, onGel]) {
    await Effect.runPromise(
      journal.append(
        statementStream(statement.id),
        0,
        [statementAdded({ ...statement, subjectId: duplicate.id, argumentIds: [] })],
        { actorId: 'author-id' },
      ),
    )
  }
}

const execute = (
  params: typeof merge,
  run?: RunUnitOfWork,
  statementIds: string[] = [],
  engaging: Record<string, string[]> = {},
) => runWith(fakes(statementIds, engaging))(mergeSubjectsUseCase(params), run)

/** The manifesto takes the position « favorable » of the subject that disappears */
async function seedManifesto(journal: Journal) {
  await Effect.runPromise(
    journal.append(
      jointDeclarationStream(manifesto.id),
      0,
      [
        jointDeclarationPublished(manifesto),
        positionTaken({
          subjectId: duplicate.id,
          positionId: favorable.id,
          quote: 'Les mots du texte.',
        }),
      ],
      { actorId: 'founder' },
    ),
  )
}

describe('mergeSubjectsUseCase', () => {
  it('refuses a visitor who is not signed in', async () => {
    const result = await execute({ ...merge, contributor: null as never })
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('takes the rank Idéaliste', async () => {
    const result = await execute({ ...merge, contributor: { id: 'abc', reputation: 9_999 } })
    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('refuses to merge a subject into itself', async () => {
    const result = await execute({ ...merge, targetSubjectId: duplicate.id })
    expect(Either.isLeft(result) && result.left).toContain('lui-même')
  })

  it('refuses a merge that does not hold up as a form', async () => {
    const result = await execute({ ...merge, positions: [{ into: pour.id }] as never })
    expect(Either.isLeft(result) && result.left).toContain('Données invalides')
  })

  it('refuses a fold into no position at all', async () => {
    const result = await execute({
      ...merge,
      positions: [{ positionId: favorable.id, into: '' }, { positionId: gel.id }] as never,
    })
    expect(Either.isLeft(result) && result.left).toContain('Données invalides')
  })

  it('records the merge on both subjects and the move on each statement', async () => {
    const { run, journal } = await bothSubjects()
    await seedStatements(journal)
    const before = journal.all().length

    const result = await execute(merge, run, [onFavorable.id, onGel.id])

    // The subject that remains, for whoever must lead the contributor to it
    expect(Either.isRight(result) && result.right.slug).toEqual(kept.slug)
    expect(written(journal, before)).toEqual([
      ['subject', kept.id, 'SubjectAbsorbed'],
      ['subject', duplicate.id, 'SubjectMergedInto'],
      ['statement', onFavorable.id, 'StatementMovedToSubject'],
      ['statement', onGel.id, 'StatementMovedToSubject'],
    ])
    expect(
      journal
        .all()
        .slice(-2)
        .map((e) => e.payload),
    ).toEqual([
      { subjectId: kept.id, positionId: pour.id },
      { subjectId: kept.id, positionId: gel.id },
    ])
  })

  it('leads a joint declaration that engaged the subject to the one that remains, on the position its own became', async () => {
    const { run, journal } = await bothSubjects()
    await seedManifesto(journal)

    const result = await execute(merge, run, [], { [duplicate.id]: [manifesto.id] })

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().at(-1)).toMatchObject({
      streamType: 'joint_declaration',
      streamId: manifesto.id,
      type: 'EngagedSubjectMerged',
      // « Favorable » was folded into « Pour »: the text takes that one
      payload: { sourcePositionId: favorable.id, subjectId: kept.id, positionId: pour.id },
    })
  })

  it('lets a joint declaration that engaged both subjects take its positions on the one that remains', async () => {
    const { run, journal } = await bothSubjects()
    await seedManifesto(journal)
    await Effect.runPromise(
      journal.append(
        jointDeclarationStream(manifesto.id),
        2,
        [positionTaken({ subjectId: kept.id, positionId: contre.id, quote: 'D’autres mots.' })],
        { actorId: 'founder' },
      ),
    )

    const result = await execute(merge, run, [], {
      [duplicate.id]: [manifesto.id],
      [kept.id]: [manifesto.id],
    })

    expect(Either.isRight(result)).toBe(true)
    const text = replayJointDeclaration(
      journal.all().filter((event) => event.streamId === manifesto.id),
    )
    expect(Either.getOrThrow(text)?.positions.map(({ positionId }) => positionId)).toEqual([
      pour.id,
      contre.id,
    ])
  })

  it('hands the themes and the links over, and leads a linked subject to the one that remains', async () => {
    const { run, journal } = await bothSubjects()
    await appendTo(journal, duplicate.id, 3, [
      subjectThemesSet([{ themeId: 'eco', isPrimary: true }]),
      subjectLinked(neighbour.id),
    ])
    await appendTo(journal, neighbour.id, 1, [subjectLinked(duplicate.id)])
    const before = journal.all().length

    const result = await execute({ ...merge, sourceRevision: 5 }, run)

    expect(Either.isRight(result)).toBe(true)
    expect(written(journal, before)).toEqual([
      ['subject', kept.id, 'SubjectAbsorbed'],
      ['subject', kept.id, 'SubjectThemesSet'],
      ['subject', kept.id, 'SubjectLinked'],
      ['subject', duplicate.id, 'SubjectMergedInto'],
      ['subject', neighbour.id, 'SubjectUnlinked'],
      ['subject', neighbour.id, 'SubjectLinked'],
    ])
  })

  it('skips a linked subject deleted meanwhile', async () => {
    const { run, journal } = await bothSubjects()
    await appendTo(journal, duplicate.id, 3, [subjectLinked('gone')])

    const result = await execute({ ...merge, sourceRevision: 4 }, run)

    expect(Either.isRight(result)).toBe(true)
  })

  it('refuses when either subject moved since the page was rendered, leaving no event behind', async () => {
    const { run, journal } = await bothSubjects()
    const before = journal.all().length

    const staleSource = await execute({ ...merge, sourceRevision: 2 }, run)
    const staleTarget = await execute({ ...merge, targetRevision: 2 }, run)

    expect(staleSource).toEqual(Either.left(EDITED_MEANWHILE))
    expect(staleTarget).toEqual(Either.left(EDITED_MEANWHILE))
    expect(journal.all()).toHaveLength(before)
  })

  it('refuses a position left without a fate, leaving no event behind', async () => {
    const { run, journal } = await bothSubjects()
    const before = journal.all().length

    const result = await execute({ ...merge, positions: [{ positionId: gel.id }] }, run)

    expect(result).toEqual(Either.left(POSITIONS_UNSETTLED))
    expect(journal.all()).toHaveLength(before)
  })

  it('refuses a subject already merged', async () => {
    const { run } = await bothSubjects()
    await execute(merge, run)

    const again = await execute({ ...merge, sourceRevision: 4, targetRevision: 4 }, run)

    expect(again).toEqual(Either.left('Sujet introuvable.'))
  })
})
