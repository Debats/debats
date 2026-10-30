import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer } from 'effect'
import { updatePositionUseCase } from './update-position'
import { PositionRepository } from '../repositories/position-repository'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'
import { journalWithSubjects, samplePosition, sampleSubject } from './subject-test-helpers'

const subject = sampleSubject()
const position = samplePosition(subject.id)

const positionRepo = {
  findById: (id: string) => Effect.succeed(id === position.id ? position : null),
} as unknown as PositionRepository

const validParams = {
  positionId: position.id,
  title: 'Pour',
  description: 'Une description revue, suffisamment longue.',
  revision: 0,
}

const eloquent = { id: 'abc', reputation: 10000 }

const execute = runFormWith(Layer.succeed(PositionRepository, positionRepo))

describe('updatePositionUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await execute(updatePositionUseCase({ ...validParams, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await execute(
      updatePositionUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when position does not exist', async () => {
    const result = await execute(
      updatePositionUseCase({ ...validParams, contributor: eloquent, positionId: 'missing' }),
    )
    expect(result).toEqual(Either.left('Position introuvable.'))
  })

  it('should fail when the position was merged away meanwhile', async () => {
    const { run } = await journalWithSubjects([subject, []])
    const result = await execute(
      updatePositionUseCase({ ...validParams, contributor: eloquent }),
      run,
    )
    expect(result).toEqual(Either.left('Position introuvable.'))
  })

  it('should fail when title is too short', async () => {
    const result = await execute(
      updatePositionUseCase({ ...validParams, contributor: eloquent, title: 'Ab' }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when description is too short', async () => {
    const result = await execute(
      updatePositionUseCase({ ...validParams, contributor: eloquent, description: 'Court' }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should update position and award reputation on success', async () => {
    const { run, journal } = await journalWithSubjects([subject, [position]])

    const result = await execute(
      updatePositionUseCase({ ...validParams, contributor: eloquent }),
      run,
    )

    expect(Either.isRight(result) && result.right).toMatchObject({
      id: position.id,
      title: 'Pour',
      slug: 'pour',
      subjectId: subject.id,
      createdBy: 'founder',
    })
    expect(deedsIn(journal).at(-1)).toMatchObject({
      streamId: subject.id,
      type: 'PositionEdited',
      revision: 3,
      actorId: 'abc',
      payload: { positionId: position.id, slug: 'pour' },
    })
    expect(grantsIn(journal)).toEqual([['abc', 'edited_position', 5]])
  })
})
