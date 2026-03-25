import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { updateStatementUseCase } from './update-statement'
import { createStatement, Statement } from '../entities/statement'
import { Position, createPosition } from '../entities/position'

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
  publicFigureId: 'figure-1',
  positionId: existingPosition.id,
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Citation originale suffisamment longue.',
  statedAt: new Date('2024-01-15'),
  createdBy: 'author-id',
})

const allPositions = [existingPosition, anotherPosition, positionOnOtherSubject]

const fakeStatementRepo = {
  findById: (id: string) => Effect.succeed(id === existingStatement.id ? existingStatement : null),
  findByPublicFigureId: () => Effect.succeed([]),
  findByPositionId: () => Effect.succeed([]),
  findByPositionIdWithFigures: () => Effect.succeed([]),
  findByPublicFigureWithDetails: () => Effect.succeed([]),
  findByPublicFigureAndSubject: () => Effect.succeed([]),
  findBySubjectWithFigures: () => Effect.succeed([]),
  findLatest: () => Effect.succeed([]),
  findLatestReported: () => Effect.succeed([]),
  create: (s: Statement) => Effect.succeed(s),
  update: (s: Statement) => Effect.succeed(s),
  delete: () => Effect.succeed(undefined as void),
}

const fakePositionRepo = {
  findById: (id: string) => Effect.succeed(allPositions.find((p) => p.id === id) ?? null),
  findBySubjectId: () => Effect.succeed([]),
  create: (p: Position) => Effect.succeed(p),
  update: (p: Position) => Effect.succeed(p),
  delete: () => Effect.succeed(undefined as void),
  mergeInto: () => Effect.succeed(undefined as void),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const validParams = {
  statementId: existingStatement.id,
  positionId: existingPosition.id,
  sourceName: 'France Inter',
  sourceUrl: 'https://franceinter.fr/article',
  quote: 'Nouvelle citation suffisamment longue.',
  statedAt: '2024-06-20',
  statementRepo: fakeStatementRepo,
  positionRepo: fakePositionRepo,
  reputationRepo: fakeReputationRepo,
}

describe('updateStatementUseCase', () => {
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
    let updatedStatement: Statement | null = null
    let reputationRecorded = false

    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      positionId: anotherPosition.id,
      statementRepo: {
        ...fakeStatementRepo,
        update: (s: Statement) => {
          updatedStatement = s
          return Effect.succeed(s)
        },
      },
      reputationRepo: {
        ...fakeReputationRepo,
        recordEvent: () => {
          reputationRecorded = true
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    expect(updatedStatement).not.toBeNull()
    expect(updatedStatement!.positionId).toBe(anotherPosition.id)
    expect(updatedStatement!.sourceName).toBe('France Inter')
    expect(updatedStatement!.quote).toBe('Nouvelle citation suffisamment longue.')
    expect(reputationRecorded).toBe(true)
  })

  it('should allow keeping the same position', async () => {
    const result = await updateStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
    })

    expect(Either.isRight(result)).toBe(true)
  })
})
