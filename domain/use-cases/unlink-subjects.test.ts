import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { unlinkSubjectsUseCase } from './unlink-subjects'

function fakeRelatedRepo() {
  const unlinked: Array<{ id1: string; id2: string }> = []

  return {
    repo: {
      findRelated: () => Effect.succeed([]),
      link: () => Effect.succeed(undefined as void),
      unlink: (id1: string, id2: string) => {
        unlinked.push({ id1, id2 })
        return Effect.succeed(undefined as void)
      },
    },
    unlinked,
  }
}

describe('unlinkSubjectsUseCase', () => {
  it('should fail when contributor is null', async () => {
    const { repo } = fakeRelatedRepo()
    const result = await unlinkSubjectsUseCase({
      contributor: null,
      subjectId1: 'subject-a',
      subjectId2: 'subject-b',
      relatedRepo: repo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const { repo } = fakeRelatedRepo()
    const result = await unlinkSubjectsUseCase({
      contributor: { id: 'abc', reputation: 0 },
      subjectId1: 'subject-a',
      subjectId2: 'subject-b',
      relatedRepo: repo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should unlink two subjects on success', async () => {
    const { repo, unlinked } = fakeRelatedRepo()
    const result = await unlinkSubjectsUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId1: 'subject-a',
      subjectId2: 'subject-b',
      relatedRepo: repo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(unlinked).toEqual([{ id1: 'subject-a', id2: 'subject-b' }])
  })
})
