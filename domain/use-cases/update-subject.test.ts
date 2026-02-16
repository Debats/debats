import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { updateSubjectUseCase } from './update-subject'
import { createSubject, Subject } from '../entities/subject'

const existingSubject = createSubject({
  title: 'Sujet existant',
  presentation: 'Une présentation suffisamment longue pour être valide.',
  problem: 'Une problématique suffisamment longue pour être valide.',
  createdBy: 'author-id',
})

const fakeSubjectRepo = {
  findById: (id: string) => Effect.succeed(id === existingSubject.id ? existingSubject : null),
  update: (s: Subject) => Effect.succeed(s),
  create: (s: Subject) => Effect.succeed(s),
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({ subjectId: '', positionsCount: 0, publicFiguresCount: 0, statementsCount: 0 }),
  findSummariesByActivity: () => Effect.succeed([]),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  addReputation: () => Effect.succeed(undefined as void),
}

const validParams = {
  subjectId: existingSubject.id,
  title: 'Nouveau titre valide',
  presentation: 'Une nouvelle présentation suffisamment longue.',
  problem: 'Une nouvelle problématique suffisamment longue.',
  subjectRepo: fakeSubjectRepo,
  reputationRepo: fakeReputationRepo,
}

describe('updateSubjectUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 9999 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Idéaliste')
    }
  })

  it('should fail when subject does not exist', async () => {
    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      subjectId: 'unknown-id',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when title is invalid', async () => {
    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      title: 'ab',
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should update subject and award reputation on success', async () => {
    let reputationAdded = 0

    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      reputationRepo: {
        getReputation: () => Effect.succeed(10000),
        addReputation: (_id, amount) => {
          reputationAdded = amount
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.title).toBe('Nouveau titre valide')
    }
    expect(reputationAdded).toBe(5)
  })
})
