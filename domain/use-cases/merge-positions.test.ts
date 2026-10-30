import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer } from 'effect'
import { mergePositionsUseCase } from './merge-positions'
import { createStatement } from '../entities/entity-test-helpers'
import { publicFigureAuthor, Statement } from '../entities/statement'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { statementAdded, statementStream } from '../aggregates/statement'
import { runWith } from './command-test-helpers'
import { journalWithSubjects, samplePosition, sampleSubject } from './subject-test-helpers'

const subject = sampleSubject()
const source = samplePosition(subject.id, 'Pour une hausse')
const target = samplePosition(subject.id, 'Pour')
const other = sampleSubject('Les retraites')
const elsewhere = samplePosition(other.id, 'Contre')

const statement = createStatement({
  author: publicFigureAuthor('figure-1'),
  positionId: source.id,
  statementType: 'declaration',
  sourceName: 'Le Monde',
  quote: 'Une citation suffisamment longue pour être valide.',
  statedAt: new Date('2024-01-15'),
  createdBy: 'author-id',
})

const positionRepo = {
  findById: (id: string) =>
    Effect.succeed([source, target, elsewhere].find((p) => p.id === id) ?? null),
} as unknown as PositionRepository

const statementRepo = (statements: Statement[]) =>
  ({ findByPositionId: () => Effect.succeed(statements) }) as unknown as StatementRepository

const founder = { id: 'founder', reputation: 1_000_000 }

const validParams = {
  sourcePositionId: source.id,
  targetPositionId: target.id,
  contributor: founder,
}

/** The read side as the test wants it: which statements stand on the source */
const fakes = (statements: Statement[] = []) =>
  Layer.mergeAll(
    Layer.succeed(PositionRepository, positionRepo),
    Layer.succeed(StatementRepository, statementRepo(statements)),
  )

const execute = runWith(fakes())

describe('mergePositionsUseCase', () => {
  it('should fail if source and target are the same', async () => {
    const result = await execute(
      mergePositionsUseCase({ ...validParams, targetPositionId: source.id }),
    )
    expect(Either.isLeft(result) && result.left).toContain('identiques')
  })

  it('refuses a visitor who is not signed in', async () => {
    const result = await execute(mergePositionsUseCase({ ...validParams, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail if contributor lacks admin permission', async () => {
    const result = await execute(
      mergePositionsUseCase({ ...validParams, contributor: { id: 'abc', reputation: 100 } }),
    )
    expect(Either.isLeft(result) && result.left).toContain('Fondateur')
  })

  it('should fail if source position not found', async () => {
    const result = await execute(
      mergePositionsUseCase({ ...validParams, sourcePositionId: 'missing' }),
    )
    expect(Either.isLeft(result) && result.left).toContain('source')
  })

  it('should fail if positions belong to different subjects', async () => {
    const result = await execute(
      mergePositionsUseCase({ ...validParams, targetPositionId: elsewhere.id }),
    )
    expect(Either.isLeft(result) && result.left).toContain('même sujet')
  })

  it('should record the merge on the subject and a move on each statement of the source', async () => {
    const { run, journal } = await journalWithSubjects([subject, [source, target]])
    await Effect.runPromise(
      journal.append(
        statementStream(statement.id),
        0,
        [statementAdded({ ...statement, subjectId: subject.id, argumentIds: [] })],
        {
          actorId: 'author-id',
        },
      ),
    )

    const result = await runWith(fakes([statement]))(mergePositionsUseCase(validParams), run)

    expect(Either.isRight(result)).toBe(true)
    expect(
      journal
        .all()
        .slice(-2)
        .map((e) => [e.streamType, e.type, e.payload]),
    ).toEqual([
      ['subject', 'PositionMergedInto', { sourceId: source.id, targetId: target.id }],
      ['statement', 'StatementMoved', { positionId: target.id }],
    ])
  })

  it('should refuse when the source was already merged, leaving no event behind', async () => {
    const { run, journal } = await journalWithSubjects([subject, [target]])

    const result = await execute(mergePositionsUseCase(validParams), run)

    expect(Either.isLeft(result) && result.left).toContain('n’existe plus')
    expect(journal.all().map((e) => e.type)).toEqual(['SubjectAdded', 'PositionAdded'])
  })
})
