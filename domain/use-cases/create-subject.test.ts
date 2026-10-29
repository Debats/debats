import { describe, it, expect } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { createSubjectUseCase } from './create-subject'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { SubjectRepository } from '../repositories/subject-repository'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'

/** The read side answers the slug lookup with what it holds, or nothing */
const subjectRepo = (existing: unknown = null) =>
  Layer.succeed(SubjectRepository, {
    findBySlug: () => Effect.succeed(existing),
  } as unknown as SubjectRepository)

const validParams = {
  title: 'Le montant du SMIC',
  presentation: 'Une présentation suffisamment longue.',
  problem: 'Faut-il augmenter le SMIC ?',
}

const execute = runFormWith(subjectRepo())

describe('createSubjectUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await execute(createSubjectUseCase({ ...validParams, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await execute(
      createSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when title is invalid', async () => {
    const result = await execute(
      createSubjectUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 10000 },
        title: 'Ab',
      }),
    )
    expect(
      Either.isLeft(result) && typeof result.left !== 'string' && result.left.title,
    ).toBeDefined()
  })

  it('should fail when presentation is too short', async () => {
    const result = await execute(
      createSubjectUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 10000 },
        presentation: 'Court',
      }),
    )
    expect(
      Either.isLeft(result) && typeof result.left !== 'string' && result.left.presentation,
    ).toBeDefined()
  })

  it('refuses a title another subject already bears, on the title field', async () => {
    const result = await runFormWith(subjectRepo({ id: 'existing', slug: 'le-montant-du-smic' }))(
      createSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 10000 } }),
    )
    expect(Either.isLeft(result) && result.left).toEqual({
      title: 'Un sujet porte déjà ce titre.',
    })
  })

  it('should create subject and award reputation on success', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await execute(
      createSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 10000 } }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right).toMatchObject({
        title: 'Le montant du SMIC',
        slug: 'le-montant-du-smic',
        createdBy: 'abc',
      })
      expect(deedsIn(journal).map((e) => [e.streamType, e.streamId, e.revision, e.type])).toEqual([
        ['subject', result.right.id, 1, 'SubjectAdded'],
      ])
    }
    expect(grantsIn(journal)).toEqual([['abc', 'added_subject', 50]])
  })
})
