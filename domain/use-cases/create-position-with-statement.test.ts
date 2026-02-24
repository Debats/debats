import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { createPositionWithStatementUseCase } from './create-position-with-statement'
import { Position, PositionId, PositionTitle } from '../entities/position'
import { Statement, Evidence } from '../entities/statement'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'
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

const fakePublicFigure = PublicFigure.make({
  id: PublicFigureId.make('figure-1'),
  name: PublicFigureName.make('Jean Dupont'),
  slug: PublicFigureSlug.make('jean-dupont'),
  presentation: 'Un personnage public suffisamment connu.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
  websiteUrl: Option.none(),
  createdBy: 'someone',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakeStatementRepo = {
  create: (s: Statement) => Effect.succeed(s),
  createEvidence: (e: Evidence) => Effect.succeed(e),
  findById: () => Effect.succeed(null),
  findByPublicFigureId: () => Effect.succeed([]),
  findByPositionId: () => Effect.succeed([]),
  findByPublicFigureWithDetails: () => Effect.succeed([]),
  findBySubjectWithFigures: () => Effect.succeed([]),
  findLatest: () => Effect.succeed([]),
  delete: () => Effect.succeed(undefined as void),
  getEvidences: () => Effect.succeed([]),
}

const fakePositionRepo = {
  findById: () => Effect.succeed(null as Position | null),
  findBySubjectId: () => Effect.succeed([] as Position[]),
  create: (p: Position) => Effect.succeed(p),
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

const fakePublicFigureRepo = {
  findAll: () => Effect.succeed([fakePublicFigure]),
  searchByName: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(fakePublicFigure as PublicFigure | null),
  findById: () => Effect.succeed(fakePublicFigure as PublicFigure | null),
  findByWikipediaUrl: () => Effect.succeed(null as PublicFigure | null),
  create: (f: PublicFigure) => Effect.succeed(f),
  update: (f: PublicFigure) => Effect.succeed(f),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({
      publicFigureId: '',
      subjectsCount: 0,
      positionsCount: 0,
      statementsCount: 0,
    }),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  addReputation: () => Effect.succeed(undefined as void),
}

const validParams = {
  subjectId: 'subject-1',
  publicFigureId: 'figure-1',
  title: 'Pour l\u2019interdiction',
  description: 'Les SUV devraient être interdits dans les centres-villes.',
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  factDate: '2024-01-15',
  statementRepo: fakeStatementRepo,
  positionRepo: fakePositionRepo,
  subjectRepo: fakeSubjectRepo,
  publicFigureRepo: fakePublicFigureRepo,
  reputationRepo: fakeReputationRepo,
}

describe('createPositionWithStatementUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail with field error when position title is too short', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      title: 'Ab',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.title).toBeDefined()
    }
  })

  it('should fail with field error when position description is too short', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      description: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.description).toBeDefined()
    }
  })

  it('should fail with field error when quote is too short', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      quote: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.quote).toBeDefined()
    }
  })

  it('should fail with field error when source name is empty', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      sourceName: '',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.sourceName).toBeDefined()
    }
  })

  it('should fail with field error when fact date is invalid', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      factDate: 'pas-une-date',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.factDate).toBeDefined()
    }
  })

  it('should fail with multiple field errors across both steps', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      title: 'Ab',
      description: 'Court',
      quote: 'Court',
      sourceName: '',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.title).toBeDefined()
      expect(result.left.description).toBeDefined()
      expect(result.left.quote).toBeDefined()
      expect(result.left.sourceName).toBeDefined()
    }
  })

  it('should fail when subject is not found', async () => {
    const result = await createPositionWithStatementUseCase({
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

  it('should fail when public figure is not found', async () => {
    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        findById: () => Effect.succeed(null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('personnalité')
    }
  })

  it('should create position, statement, evidence and award 100 pts on success', async () => {
    let totalReputationAdded = 0
    let createdPosition: Position | null = null
    let createdStatement: Statement | null = null
    let createdEvidence: Evidence | null = null

    const result = await createPositionWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      positionRepo: {
        ...fakePositionRepo,
        create: (p: Position) => {
          createdPosition = p
          return Effect.succeed(p)
        },
      },
      statementRepo: {
        ...fakeStatementRepo,
        create: (s: Statement) => {
          createdStatement = s
          return Effect.succeed(s)
        },
        createEvidence: (e: Evidence) => {
          createdEvidence = e
          return Effect.succeed(e)
        },
      },
      reputationRepo: {
        getReputation: () => Effect.succeed(0),
        addReputation: (_id, amount) => {
          totalReputationAdded += amount
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
    expect(createdStatement).not.toBeNull()
    expect(createdStatement!.positionId).toBe(createdPosition!.id)
    expect(createdStatement!.publicFigureId).toBe('figure-1')
    expect(createdEvidence).not.toBeNull()
    expect(createdEvidence!.statementId).toBe(createdStatement!.id)
    expect(createdEvidence!.sourceName).toBe('Le Monde')
    expect(totalReputationAdded).toBe(100)
  })
})
