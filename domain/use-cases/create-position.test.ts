import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { createPositionUseCase } from './create-position'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'
import { journalWithSubjects, sampleSubject } from './subject-test-helpers'

const subject = sampleSubject()

const validParams = {
  subjectId: subject.id,
  title: 'Pour une hausse',
  description: 'Une description suffisamment longue pour être valide.',
}

const eloquent = { id: 'abc', reputation: 10000 }

const execute = runFormWith(Layer.empty)

describe('createPositionUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await execute(createPositionUseCase({ ...validParams, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail with field error when title is too short', async () => {
    const result = await execute(
      createPositionUseCase({ ...validParams, contributor: eloquent, title: 'Ab' }),
    )
    expect(
      Either.isLeft(result) && typeof result.left !== 'string' && result.left.title,
    ).toBeDefined()
  })

  it('should fail with field error when description is too short', async () => {
    const result = await execute(
      createPositionUseCase({ ...validParams, contributor: eloquent, description: 'Court' }),
    )
    expect(
      Either.isLeft(result) && typeof result.left !== 'string' && result.left.description,
    ).toBeDefined()
  })

  it('should fail with multiple field errors at once', async () => {
    const result = await execute(
      createPositionUseCase({
        ...validParams,
        contributor: eloquent,
        title: 'Ab',
        description: 'Court',
      }),
    )
    expect(
      Either.isLeft(result) && typeof result.left !== 'string' ? Object.keys(result.left) : [],
    ).toEqual(['title', 'description'])
  })

  it('should fail when subject is not found', async () => {
    const result = await execute(
      createPositionUseCase({ ...validParams, contributor: eloquent, subjectId: 'missing' }),
    )
    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('should create position and award 50 pts on success', async () => {
    const { run, journal } = await journalWithSubjects([subject, []])

    const result = await execute(
      createPositionUseCase({ ...validParams, contributor: eloquent }),
      run,
    )

    expect(Either.isRight(result) && result.right).toMatchObject({
      title: 'Pour une hausse',
      slug: 'pour-une-hausse',
      subjectId: subject.id,
      createdBy: 'abc',
    })
    expect(deedsIn(journal).at(-1)).toMatchObject({
      streamId: subject.id,
      type: 'PositionAdded',
      revision: 2,
      actorId: 'abc',
    })
    expect(grantsIn(journal)).toEqual([['abc', 'added_position_validated', 50]])
  })
})
