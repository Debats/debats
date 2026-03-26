import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { createSubjectUseCase } from './create-subject'
import { Subject } from '../entities/subject'

const fakeSubjectRepo = {
  create: (subject: Subject) => Effect.succeed(subject),
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null),
  findById: () => Effect.succeed(null),
  update: (s: Subject) => Effect.succeed(s),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({ subjectId: '', positionsCount: 0, publicFiguresCount: 0, statementsCount: 0 }),
  findSummariesByActivity: () => Effect.succeed([]),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findAllIds: () => Effect.succeed([]),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const validParams = {
  title: 'Un sujet valide',
  presentation: 'Une présentation suffisamment longue pour être valide.',
  problem: 'Une problématique suffisamment longue pour être valide.',
  subjectRepo: fakeSubjectRepo,
  reputationRepo: fakeReputationRepo,
}

describe('createSubjectUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createSubjectUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail when title is invalid', async () => {
    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      title: 'ab',
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when presentation is too short', async () => {
    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      presentation: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should create subject and award reputation on success', async () => {
    let recordedEvent: { action: string; amount: number } | null = null

    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      reputationRepo: {
        getReputation: () => Effect.succeed(1000),
        recordEvent: (event) => {
          recordedEvent = { action: event.action, amount: event.amount }
          return Effect.succeed(undefined as void)
        },
        getHistory: () => Effect.succeed([]),
      },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.title).toBe('Un sujet valide')
      expect(result.right.createdBy).toBe('abc')
    }
    expect(recordedEvent).toEqual({ action: 'added_subject', amount: 50 })
  })
})
