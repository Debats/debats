import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { deleteSubjectUseCase } from './delete-subject'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../entities/subject'

const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

const minorSubject: Subject = Subject.make({
  id: SubjectId.make('minor-id'),
  title: SubjectTitle.make('Sujet mineur'),
  slug: SubjectSlug.make('sujet-mineur'),
  presentation: 'Une présentation suffisamment longue pour être valide.',
  problem: 'Une problématique suffisamment longue pour être valide.',
  createdAt: twoWeeksAgo,
  updatedAt: twoWeeksAgo,
})

const fakeSubjectRepo = {
  findById: (id: string) => Effect.succeed(id === minorSubject.id ? minorSubject : null),
  delete: () => Effect.succeed(undefined as void),
  create: (s: Subject) => Effect.succeed(s),
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null),
  update: (s: Subject) => Effect.succeed(s),
  getStats: () =>
    Effect.succeed({ subjectId: '', positionsCount: 0, publicFiguresCount: 0, statementsCount: 2 }),
  findSummariesByActivity: () => Effect.succeed([]),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

describe('deleteSubjectUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await deleteSubjectUseCase({
      contributor: null,
      subjectId: minorSubject.id,
      subjectRepo: fakeSubjectRepo,
      reputationRepo: fakeReputationRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when subject does not exist', async () => {
    const result = await deleteSubjectUseCase({
      contributor: { id: 'abc', reputation: 10000 },
      subjectId: 'unknown-id',
      subjectRepo: fakeSubjectRepo,
      reputationRepo: fakeReputationRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when contributor lacks reputation for minor subject', async () => {
    const result = await deleteSubjectUseCase({
      contributor: { id: 'abc', reputation: 9999 },
      subjectId: minorSubject.id,
      subjectRepo: fakeSubjectRepo,
      reputationRepo: fakeReputationRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Idéaliste')
    }
  })

  it('should require Fondateur for major subject', async () => {
    const majorSubjectRepo = {
      ...fakeSubjectRepo,
      getStats: () =>
        Effect.succeed({
          subjectId: '',
          positionsCount: 0,
          publicFiguresCount: 0,
          statementsCount: 10,
        }),
    }

    const result = await deleteSubjectUseCase({
      contributor: { id: 'abc', reputation: 10000 },
      subjectId: minorSubject.id,
      subjectRepo: majorSubjectRepo,
      reputationRepo: fakeReputationRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Fondateur')
    }
  })

  it('should delete minor subject when contributor is Idéaliste', async () => {
    const result = await deleteSubjectUseCase({
      contributor: { id: 'abc', reputation: 10000 },
      subjectId: minorSubject.id,
      subjectRepo: fakeSubjectRepo,
      reputationRepo: fakeReputationRepo,
    })

    expect(Either.isRight(result)).toBe(true)
  })
})
