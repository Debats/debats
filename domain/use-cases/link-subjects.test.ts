import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { linkSubjectsUseCase } from './link-subjects'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../entities/subject'

function fakeSubject(id: string, title: string): Subject {
  return Subject.make({
    id: SubjectId.make(id),
    title: SubjectTitle.make(title),
    slug: SubjectSlug.make(title.toLowerCase().replace(/ /g, '-')),
    presentation: 'Présentation suffisamment longue',
    problem: 'Problème suffisamment long',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

const subjectA = fakeSubject('subject-a', 'Sujet Alpha')
const subjectB = fakeSubject('subject-b', 'Sujet Bravo')

const fakeSubjectRepo = {
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null),
  findById: (id: string) =>
    Effect.succeed(id === 'subject-a' ? subjectA : id === 'subject-b' ? subjectB : null),
  create: () => Effect.succeed(null as never),
  update: () => Effect.succeed(null as never),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({ subjectId: '', positionsCount: 0, publicFiguresCount: 0, statementsCount: 0 }),
  findSummariesByActivity: () => Effect.succeed([]),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findSummariesByIds: () => Effect.succeed([]),
  findAllIds: () => Effect.succeed([]),
  findIdsWithoutPrimaryTheme: () => Effect.succeed([]),
}

function fakeRelatedRepo() {
  const linked: Array<{ id1: string; id2: string }> = []

  return {
    repo: {
      findRelated: () => Effect.succeed([]),
      link: (id1: string, id2: string) => {
        linked.push({ id1, id2 })
        return Effect.succeed(undefined as void)
      },
      unlink: () => Effect.succeed(undefined as void),
    },
    linked,
  }
}

describe('linkSubjectsUseCase', () => {
  it('should fail when contributor is null', async () => {
    const { repo } = fakeRelatedRepo()
    const result = await linkSubjectsUseCase({
      contributor: null,
      subjectId1: 'subject-a',
      subjectId2: 'subject-b',
      subjectRepo: fakeSubjectRepo,
      relatedRepo: repo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const { repo } = fakeRelatedRepo()
    const result = await linkSubjectsUseCase({
      contributor: { id: 'abc', reputation: 0 },
      subjectId1: 'subject-a',
      subjectId2: 'subject-b',
      subjectRepo: fakeSubjectRepo,
      relatedRepo: repo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail when linking a subject to itself', async () => {
    const { repo } = fakeRelatedRepo()
    const result = await linkSubjectsUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId1: 'subject-a',
      subjectId2: 'subject-a',
      subjectRepo: fakeSubjectRepo,
      relatedRepo: repo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('même sujet')
    }
  })

  it('should fail when a subject does not exist', async () => {
    const { repo } = fakeRelatedRepo()
    const result = await linkSubjectsUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId1: 'subject-a',
      subjectId2: 'nonexistent',
      subjectRepo: fakeSubjectRepo,
      relatedRepo: repo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should link two subjects on success', async () => {
    const { repo, linked } = fakeRelatedRepo()
    const result = await linkSubjectsUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId1: 'subject-a',
      subjectId2: 'subject-b',
      subjectRepo: fakeSubjectRepo,
      relatedRepo: repo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(linked).toEqual([{ id1: 'subject-a', id2: 'subject-b' }])
  })
})
