import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { createSubjectUseCase } from './create-subject'
import { inMemoryUnitOfWork } from '../events/event-store-memory'

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const validParams = {
  title: 'Le montant du SMIC',
  presentation: 'Une présentation suffisamment longue.',
  problem: 'Faut-il augmenter le SMIC ?',
  runUnitOfWork: inMemoryUnitOfWork().run,
  reputationRepo: fakeReputationRepo,
}

describe('createSubjectUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createSubjectUseCase({ ...validParams, contributor: null })
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when title is invalid', async () => {
    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      title: 'Ab',
    })
    expect(
      Either.isLeft(result) && typeof result.left !== 'string' && result.left.title,
    ).toBeDefined()
  })

  it('should fail when presentation is too short', async () => {
    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      presentation: 'Court',
    })
    expect(
      Either.isLeft(result) && typeof result.left !== 'string' && result.left.presentation,
    ).toBeDefined()
  })

  it('should create subject and award reputation on success', async () => {
    let reputationAdded = 0
    const { run, journal } = inMemoryUnitOfWork()

    const result = await createSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      runUnitOfWork: run,
      reputationRepo: {
        ...fakeReputationRepo,
        recordEvent: (event) => {
          reputationAdded = event.amount
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).toMatchObject({
        title: 'Le montant du SMIC',
        slug: 'le-montant-du-smic',
        createdBy: 'abc',
      })
      expect(journal.all().map((e) => [e.streamType, e.streamId, e.revision, e.type])).toEqual([
        ['subject', result.right.id, 1, 'SubjectAdded'],
      ])
    }
    expect(reputationAdded).toBeGreaterThan(0)
  })
})
