import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { updatePositionUseCase } from './update-position'
import { PositionRepository } from '../repositories/position-repository'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import {
  fakeSubjectSource,
  journalWithSubjects,
  samplePosition,
  sampleSubject,
  subjectParts,
} from './subject-test-helpers'

const subject = sampleSubject()
const position = samplePosition(subject.id)

const positionRepo = {
  findById: (id: string) => Effect.succeed(id === position.id ? position : null),
} as unknown as PositionRepository

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const validParams = {
  positionId: position.id,
  title: 'Pour',
  description: 'Une description revue, suffisamment longue.',
  runUnitOfWork: inMemoryUnitOfWork().run,
  subjectSource: fakeSubjectSource([subjectParts(subject, [position])]),
  positionRepo,
  reputationRepo: fakeReputationRepo,
}

const eloquent = { id: 'abc', reputation: 10000 }

describe('updatePositionUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await updatePositionUseCase({ ...validParams, contributor: null })
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when position does not exist', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: eloquent,
      positionId: 'missing',
    })
    expect(result).toEqual(Either.left('Position introuvable.'))
  })

  it('should fail when the position was merged away meanwhile', async () => {
    const { run } = await journalWithSubjects([subject, []])
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: eloquent,
      runUnitOfWork: run,
    })
    expect(result).toEqual(Either.left('Position introuvable.'))
  })

  it('should fail when title is too short', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: eloquent,
      title: 'Ab',
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when description is too short', async () => {
    const result = await updatePositionUseCase({
      ...validParams,
      contributor: eloquent,
      description: 'Court',
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should update position and award reputation on success', async () => {
    let reputationRecorded = false
    const { run, journal } = await journalWithSubjects([subject, [position]])

    const result = await updatePositionUseCase({
      ...validParams,
      contributor: eloquent,
      runUnitOfWork: run,
      reputationRepo: {
        ...fakeReputationRepo,
        recordEvent: () => {
          reputationRecorded = true
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result) && result.right).toMatchObject({
      id: position.id,
      title: 'Pour',
      slug: 'pour',
      subjectId: subject.id,
      createdBy: 'founder',
    })
    expect(journal.all().at(-1)).toMatchObject({
      streamId: subject.id,
      type: 'PositionEdited',
      revision: 3,
      actorId: 'abc',
      payload: { positionId: position.id, slug: 'pour' },
    })
    expect(reputationRecorded).toBe(true)
  })
})
