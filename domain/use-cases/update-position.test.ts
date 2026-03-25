import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { updatePositionUseCase } from './update-position'
import { Position, createPosition } from '../entities/position'
import { Subject, createSubject } from '../entities/subject'

const existingSubject = createSubject({
  title: 'Le nucléaire',
  presentation: 'Présentation suffisamment longue pour être valide.',
  problem: 'Problématique suffisamment longue pour être valide.',
  createdBy: 'author-id',
})

const existingPosition = createPosition({
  title: 'Pour le nucléaire',
  description: 'Description suffisamment longue pour être valide.',
  subjectId: existingSubject.id,
  createdBy: 'author-id',
})

const fakePositionRepo = {
  findById: (id: string) => Effect.succeed(id === existingPosition.id ? existingPosition : null),
  findBySubjectId: () => Effect.succeed([existingPosition]),
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
  positionId: existingPosition.id,
  title: 'Contre le nucléaire',
  description: 'Nouvelle description suffisamment longue.',
  positionRepo: fakePositionRepo,
  reputationRepo: fakeReputationRepo,
}

describe('updatePositionUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 9999 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Idéaliste')
    }
  })

  it('should fail when position does not exist', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      positionId: 'unknown-id',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when title is too short', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      title: 'AB',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.title).toBeDefined()
    }
  })

  it('should fail when description is too short', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      description: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.description).toBeDefined()
    }
  })

  it('should update position and award reputation on success', async () => {
    let updatedPosition: Position | null = null
    let reputationRecorded = false

    const result = await updatePositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      positionRepo: {
        ...fakePositionRepo,
        update: (p: Position) => {
          updatedPosition = p
          return Effect.succeed(p)
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
    expect(updatedPosition).not.toBeNull()
    expect(updatedPosition!.title).toBe('Contre le nucléaire')
    expect(updatedPosition!.description).toBe('Nouvelle description suffisamment longue.')
    expect(reputationRecorded).toBe(true)
  })
})
