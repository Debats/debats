import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { updateStatementUseCase } from './update-statement'
import { EDITED_MEANWHILE } from './run-command'
import { fakeStatementSource } from './subject-test-helpers'
import { createStatement, publicFigureAuthor } from '../entities/statement'
import { Position, createPosition } from '../entities/position'
import { addStatement, statementStream } from '../aggregates/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { deedsIn, grantsIn } from './contributor-test-helpers'

const existingPosition = createPosition({
  title: 'Pour la réforme',
  description: 'Description suffisamment longue pour être valide.',
  subjectId: 'subject-1',
  createdBy: 'author-id',
})

const anotherPosition = createPosition({
  title: 'Contre la réforme',
  description: 'Description suffisamment longue pour être valide.',
  subjectId: 'subject-1',
  createdBy: 'author-id',
})

const positionOnOtherSubject = createPosition({
  title: 'Autre sujet position',
  description: 'Description suffisamment longue pour être valide.',
  subjectId: 'subject-2',
  createdBy: 'author-id',
})

const existingStatement = createStatement({
  author: publicFigureAuthor('figure-1'),
  positionId: existingPosition.id,
  statementType: 'declaration',
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Citation originale suffisamment longue.',
  statedAt: new Date('2024-01-15'),
  createdBy: 'author-id',
})

const allPositions = [existingPosition, anotherPosition, positionOnOtherSubject]

const fakePositionRepo = {
  findById: (id: string) => Effect.succeed(allPositions.find((p) => p.id === id) ?? null),
  findBySubjectAndSlug: () => Effect.succeed(null as Position | null),
  findBySubjectId: () => Effect.succeed([]),
}

const validParams = {
  statementId: existingStatement.id,
  positionId: existingPosition.id,
  statementType: 'declaration' as const,
  sourceName: 'France Inter',
  sourceUrl: 'https://franceinter.fr/article',
  quote: 'Nouvelle citation suffisamment longue.',
  statedAt: '2024-06-20',
  arguments: { argumentIds: [] as string[], newArguments: [] },
  runUnitOfWork: inMemoryUnitOfWork().run,
  statementSource: fakeStatementSource([{ statement: existingStatement, argumentIds: [] }]),
  positionRepo: fakePositionRepo,
  argumentRepo: fakeArgumentRepo(),
}

/** A journal where the statement already has its stream, as after a backfill */
async function journalWithStream() {
  const unit = inMemoryUnitOfWork()
  await Effect.runPromise(
    unit.journal.append(
      statementStream(existingStatement.id),
      0,
      [addStatement({ ...existingStatement, argumentIds: ['old-argument'] })],
      { actorId: 'author-id' },
    ),
  )
  return unit
}

describe('updateStatementUseCase', () => {
  it('should carry the new set of arguments in the edit', async () => {
    const kept = sampleArgument('Coût budgétaire')
    const argumentRepo = fakeArgumentRepo([kept])
    const { run, journal } = await journalWithStream()

    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      arguments: { argumentIds: [kept.id], newArguments: [] },
      argumentRepo,
      runUnitOfWork: run,
    })

    expect(Either.isRight(result)).toBe(true)
    const last = deedsIn(journal).at(-1)
    expect(last).toMatchObject({ type: 'StatementEdited', revision: 2, actorId: 'abc' })
    expect(last?.payload).toMatchObject({ argumentIds: [kept.id] })
  })

  it('should import a statement that has no stream yet, as it is, before editing it', async () => {
    const old = sampleArgument('Ancien argument')
    const { run, journal } = inMemoryUnitOfWork()

    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      statementSource: fakeStatementSource([
        { statement: existingStatement, argumentIds: [old.id] },
      ]),
      runUnitOfWork: run,
    })

    expect(Either.isRight(result)).toBe(true)
    const [imported, edited] = journal.all()
    expect(imported).toMatchObject({
      type: 'StatementImported',
      revision: 1,
      actorId: 'author-id',
      occurredAt: existingStatement.createdAt,
      metadata: { source: 'import' },
      payload: {
        author: { kind: 'public_figure', id: 'figure-1' },
        quote: 'Citation originale suffisamment longue.',
        statedAt: '2024-01-15',
        argumentIds: [old.id],
      },
    })
    expect(edited).toMatchObject({ type: 'StatementEdited', revision: 2, actorId: 'abc' })
  })

  it('should tell the contributor when someone edited the statement meanwhile', async () => {
    const { run, journal } = await journalWithStream()

    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      runUnitOfWork: (work) =>
        run((events, process) =>
          work(
            {
              ...events,
              // Another writer appends between the load and the append
              append: (stream, expectedRevision, decided, options) =>
                Effect.flatMap(
                  events.append(
                    stream,
                    expectedRevision,
                    [{ type: 'StatementDeleted', payload: {} }],
                    {
                      actorId: 'someone-else',
                    },
                  ),
                  () => events.append(stream, expectedRevision, decided, options),
                ),
            },
            process,
          ),
        ),
    })

    expect(result).toEqual(Either.left(EDITED_MEANWHILE))
    expect(journal.all()).toHaveLength(1)
  })

  it('should fail when contributor is null', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 9999 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Idéaliste')
    }
  })

  it('should fail when statement does not exist', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      statementId: 'unknown-id',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when position does not exist', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      positionId: 'unknown-position',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when new position belongs to a different subject', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      positionId: positionOnOtherSubject.id,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('même sujet')
    }
  })

  it('should fail when quote is too short', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      quote: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when statedAt is invalid', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      statedAt: 'pas-une-date',
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should update statement and award reputation on success', async () => {
    const { run, journal } = await journalWithStream()

    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      positionId: anotherPosition.id,
      runUnitOfWork: run,
    })

    expect(Either.isRight(result)).toBe(true)
    const updated = Either.isRight(result) ? result.right : null
    expect(updated).toMatchObject({
      id: existingStatement.id,
      author: existingStatement.author,
      positionId: anotherPosition.id,
      sourceName: 'France Inter',
      quote: 'Nouvelle citation suffisamment longue.',
      createdBy: 'author-id',
    })
    expect(grantsIn(journal)).toEqual([['abc', 'edited_statement', 5]])
  })

  it('should allow keeping the same position', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
    })

    expect(Either.isRight(result)).toBe(true)
  })
})
