import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { createPositionUseCase } from './create-position'
import { Position, PositionId, PositionTitle } from '../entities/position'
import { Subject, SubjectId, SubjectSlug, SubjectTitle } from '../entities/subject'

const fakeSubject = Subject.make({
  id: SubjectId.make('subject-1'),
  title: SubjectTitle.make('Faut-il interdire les SUV ?'),
  slug: SubjectSlug.make('faut-il-interdire-les-suv'),
  presentation: 'Un sujet de débat sur les SUV en ville.',
  problem: 'Les SUV polluent et prennent de la place.',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakePositionRepo = {
  findById: () => Effect.succeed(null as Position | null),
  findBySubjectId: () => Effect.succeed([] as Position[]),
  create: (p: Position) => Effect.succeed(p),
  update: (p: Position) => Effect.succeed(p),
  delete: () => Effect.succeed(undefined as void),
  mergeInto: () => Effect.succeed(undefined as void),
}

const fakeSubjectRepo = {
  findAll: () => Effect.succeed([fakeSubject]),
  findBySlug: () => Effect.succeed(fakeSubject as Subject | null),
  findById: () => Effect.succeed(fakeSubject as Subject | null),
  create: (s: Subject) => Effect.succeed(s),
  update: (s: Subject) => Effect.succeed(s),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({
      subjectId: '',
      positionsCount: 0,
      statementsCount: 0,
      publicFiguresCount: 0,
    }),
  findSummariesByActivity: () => Effect.succeed([]),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const validParams = {
  subjectId: 'subject-1',
  title: 'Pour l\u2019interdiction',
  description: 'Les SUV devraient être interdits dans les centres-villes.',
  positionRepo: fakePositionRepo,
  subjectRepo: fakeSubjectRepo,
  reputationRepo: fakeReputationRepo,
}

describe('createPositionUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createPositionUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail with field error when title is too short', async () => {
    const result = await createPositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      title: 'Ab',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.title).toBeDefined()
    }
  })

  it('should fail with field error when description is too short', async () => {
    const result = await createPositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      description: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.description).toBeDefined()
    }
  })

  it('should fail with multiple field errors at once', async () => {
    const result = await createPositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      title: 'Ab',
      description: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.title).toBeDefined()
      expect(result.left.description).toBeDefined()
    }
  })

  it('should fail when subject is not found', async () => {
    const result = await createPositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      subjectRepo: {
        ...fakeSubjectRepo,
        findById: () => Effect.succeed(null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('sujet')
    }
  })

  it('should create position and award 50 pts on success', async () => {
    let totalReputationAdded = 0
    let createdPosition: Position | null = null

    const result = await createPositionUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      positionRepo: {
        ...fakePositionRepo,
        create: (p: Position) => {
          createdPosition = p
          return Effect.succeed(p)
        },
      },
      reputationRepo: {
        ...fakeReputationRepo,
        recordEvent: (event) => {
          totalReputationAdded += event.amount
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.title).toBe('Pour l\u2019interdiction')
      expect(result.right.subjectId).toBe('subject-1')
      expect(result.right.createdBy).toBe('abc')
    }

    expect(createdPosition).not.toBeNull()
    expect(totalReputationAdded).toBe(50)
  })
})
