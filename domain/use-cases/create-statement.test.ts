import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { createStatementUseCase } from './create-statement'
import { Statement } from '../entities/statement'
import { Evidence } from '../entities/statement'
import { Position, PositionId, PositionTitle } from '../entities/position'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'

const fakePosition = Position.make({
  id: PositionId.make('pos-1'),
  title: PositionTitle.make('Pour la mesure'),
  description: 'Description suffisamment longue pour être valide.',
  subjectId: 'subject-1',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakePublicFigure = PublicFigure.make({
  id: PublicFigureId.make('figure-1'),
  name: PublicFigureName.make('Jean Dupont'),
  slug: PublicFigureSlug.make('jean-dupont'),
  presentation: 'Un personnage public suffisamment connu.',
  wikipediaUrl: Option.some('https://fr.wikipedia.org/wiki/Jean_Dupont'),
  notorietySources: [],
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
  findLatestReported: () => Effect.succeed([]),
  delete: () => Effect.succeed(undefined as void),
  getEvidences: () => Effect.succeed([]),
}

const fakePositionRepo = {
  findById: () => Effect.succeed(fakePosition as Position | null),
  findBySubjectId: () => Effect.succeed([fakePosition]),
  create: (p: Position) => Effect.succeed(p),
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
    Effect.succeed({ publicFigureId: '', subjectsCount: 0, positionsCount: 0, statementsCount: 0 }),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const validParams = {
  subjectId: 'subject-1',
  publicFigureId: 'figure-1',
  positionId: 'pos-1',
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  factDate: '2024-01-15',
  statementRepo: fakeStatementRepo,
  positionRepo: fakePositionRepo,
  publicFigureRepo: fakePublicFigureRepo,
  reputationRepo: fakeReputationRepo,
}

describe('createStatementUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createStatementUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail with field error when quote is too short', async () => {
    const result = await createStatementUseCase({
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
    const result = await createStatementUseCase({
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
    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      factDate: 'pas-une-date',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.factDate).toBeDefined()
    }
  })

  it('should fail when public figure is not found', async () => {
    const result = await createStatementUseCase({
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

  it('should fail when position is not found', async () => {
    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
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

    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      positionRepo: {
        ...fakePositionRepo,
        findById: () => Effect.succeed(wrongPosition as Position | null),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
      expect(result.left).toContain('sujet')
    }
  })

  it('should create statement, evidence and award reputation on success', async () => {
    let reputationAdded = 0
    let createdStatement: Statement | null = null
    let createdEvidence: Evidence | null = null

    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
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
        recordEvent: (event) => {
          reputationAdded = event.amount
          return Effect.succeed(undefined as void)
        },
        getHistory: () => Effect.succeed([]),
      },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.publicFigureId).toBe('figure-1')
      expect(result.right.positionId).toBe('pos-1')
      expect(result.right.createdBy).toBe('abc')
    }
    expect(createdStatement).not.toBeNull()
    expect(createdEvidence).not.toBeNull()
    expect(createdEvidence!.statementId).toBe(createdStatement!.id)
    expect(createdEvidence!.sourceName).toBe('Le Monde')
    expect(reputationAdded).toBe(50)
  })
})
