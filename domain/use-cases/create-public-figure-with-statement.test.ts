import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { createPublicFigureWithStatementUseCase } from './create-public-figure-with-statement'
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

const fakePosition = Position.make({
  id: PositionId.make('position-1'),
  title: PositionTitle.make('Pour l\u2019interdiction'),
  description: 'Les SUV devraient être interdits dans les centres-villes.',
  subjectId: 'subject-1',
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
  findById: () => Effect.succeed(fakePosition as Position | null),
  findBySubjectId: () => Effect.succeed([fakePosition] as Position[]),
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
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null as PublicFigure | null),
  findById: () => Effect.succeed(null as PublicFigure | null),
  searchByName: () => Effect.succeed([]),
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

const fakeWikipediaValidator = {
  validatePage: async () => ({ exists: true, isBiography: true }),
}

const validParams = {
  name: 'Jean Dupont',
  presentation: 'Un personnage public suffisamment connu pour apparaître.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
  websiteUrl: '',
  subjectId: 'subject-1',
  positionId: 'position-1',
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  factDate: '2024-01-15',
  statementRepo: fakeStatementRepo,
  positionRepo: fakePositionRepo,
  subjectRepo: fakeSubjectRepo,
  publicFigureRepo: fakePublicFigureRepo,
  reputationRepo: fakeReputationRepo,
  wikipediaValidator: fakeWikipediaValidator,
}

describe('createPublicFigureWithStatementUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when reputation is insufficient (< 1000)', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 999 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail with field error when name is too short', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      name: 'A',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toBeDefined()
    }
  })

  it('should fail with field error when presentation is too short', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      presentation: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.presentation).toBeDefined()
    }
  })

  it('should fail with field error when Wikipedia URL is invalid', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaUrl: 'https://google.com',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toBeDefined()
    }
  })

  it('should fail with field error when quote is too short', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      quote: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.quote).toBeDefined()
    }
  })

  it('should fail with field error when source name is empty', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      sourceName: '',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.sourceName).toBeDefined()
    }
  })

  it('should fail with field error when fact date is invalid', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      factDate: 'pas-une-date',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.factDate).toBeDefined()
    }
  })

  it('should fail with multiple field errors across both steps', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      name: 'A',
      presentation: 'Court',
      wikipediaUrl: 'invalid',
      quote: 'Court',
      sourceName: '',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toBeDefined()
      expect(result.left.presentation).toBeDefined()
      expect(result.left.wikipediaUrl).toBeDefined()
      expect(result.left.quote).toBeDefined()
      expect(result.left.sourceName).toBeDefined()
    }
  })

  it('should fail when subject is not found', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
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

  it('should fail when position is not found', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      positionRepo: {
        ...fakePositionRepo,
        findById: () => Effect.succeed(null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
    }
  })

  it('should fail when position does not belong to subject', async () => {
    const wrongPosition = Position.make({
      ...fakePosition,
      subjectId: 'other-subject',
    })

    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      positionRepo: {
        ...fakePositionRepo,
        findById: () => Effect.succeed(wrongPosition),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
    }
  })

  it('should fail with field error when fact date is in the future', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureDate = tomorrow.toISOString().slice(0, 10)

    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      factDate: futureDate,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.factDate).toBeDefined()
      expect(result.left.factDate).toContain('future')
    }
  })

  it('should fail when Wikipedia page does not exist', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: {
        validatePage: async () => ({ exists: false, isBiography: false }),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toBeDefined()
      expect(result.left.wikipediaUrl).toContain('existe pas')
    }
  })

  it('should fail when Wikipedia page is not a biography', async () => {
    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: {
        validatePage: async () => ({ exists: true, isBiography: false }),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toBeDefined()
      expect(result.left.wikipediaUrl).toContain('biographi')
    }
  })

  it('should create public figure, statement, evidence and award 100 pts on success', async () => {
    let totalReputationAdded = 0
    let createdFigure: PublicFigure | null = null
    let createdStatement: Statement | null = null
    let createdEvidence: Evidence | null = null

    const result = await createPublicFigureWithStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        create: (f: PublicFigure) => {
          createdFigure = f
          return Effect.succeed(f)
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
        getReputation: () => Effect.succeed(1000),
        addReputation: (_id, amount) => {
          totalReputationAdded += amount
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.name).toBe('Jean Dupont')
      expect(result.right.wikipediaUrl).toBe('https://fr.wikipedia.org/wiki/Jean_Dupont')
      expect(result.right.createdBy).toBe('abc')
    }

    expect(createdFigure).not.toBeNull()
    expect(createdStatement).not.toBeNull()
    expect(createdStatement!.publicFigureId).toBe(createdFigure!.id)
    expect(createdStatement!.positionId).toBe('position-1')
    expect(createdEvidence).not.toBeNull()
    expect(createdEvidence!.statementId).toBe(createdStatement!.id)
    expect(createdEvidence!.sourceName).toBe('Le Monde')
    expect(totalReputationAdded).toBe(100)
  })
})
