import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { createStatementUseCase } from './create-statement'
import { organisationAuthor, publicFigureAuthor } from '../entities/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { fakeOrganisationRepo, sampleOrganisation } from './organisation-test-helpers'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { Position, PositionId, PositionSlug, PositionTitle } from '../entities/position'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'

const fakePosition = Position.make({
  id: PositionId.make('pos-1'),
  title: PositionTitle.make('Pour la mesure'),
  slug: PositionSlug.make('pour-la-mesure'),
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

const fakePositionRepo = {
  findById: () => Effect.succeed(fakePosition as Position | null),
  findBySubjectAndSlug: () => Effect.succeed(null as Position | null),
  findBySubjectId: () => Effect.succeed([fakePosition]),
  create: (p: Position) => Effect.succeed(p),
  update: (p: Position) => Effect.succeed(p),
  delete: () => Effect.succeed(undefined as void),
  mergeInto: () => Effect.succeed(undefined as void),
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
  findSummariesByActivity: () => Effect.succeed([]),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findSummariesByIds: () => Effect.succeed([]),
  findIndexEntries: () => Effect.succeed([]),
  findAllIds: () => Effect.succeed([]),
  findIdsWithoutPrimaryTheme: () => Effect.succeed([]),
  findByLetter: () => Effect.succeed([]),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const organisation = sampleOrganisation()

const validParams = {
  subjectId: 'subject-1',
  author: publicFigureAuthor('figure-1'),
  positionId: 'pos-1',
  arguments: { argumentIds: [] as string[], newArguments: [] },
  argumentRepo: fakeArgumentRepo(),
  statementType: 'declaration' as const,
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  statedAt: '2024-01-15',
  runUnitOfWork: inMemoryUnitOfWork().run,
  positionRepo: fakePositionRepo,
  publicFigureRepo: fakePublicFigureRepo,
  organisationRepo: fakeOrganisationRepo([organisation]),
  reputationRepo: fakeReputationRepo,
}

describe('createStatementUseCase', () => {
  it('should refuse arguments from a contributor below the Éloquent rank', async () => {
    const argument = sampleArgument()
    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      arguments: { argumentIds: [argument.id], newArguments: [] },
      argumentRepo: fakeArgumentRepo([argument]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('should create proposed arguments and carry every argument in the event', async () => {
    const argument = sampleArgument()
    const argumentRepo = fakeArgumentRepo([argument])
    const { run, journal } = inMemoryUnitOfWork()
    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      arguments: {
        argumentIds: [argument.id],
        newArguments: [{ title: 'Liberté de choix', description: 'Chacun décide pour lui-même.' }],
      },
      argumentRepo,
      runUnitOfWork: run,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(argumentRepo.rows).toHaveLength(2)
    expect(journal.all()[0].payload).toMatchObject({
      argumentIds: [argument.id, argumentRepo.rows[1].id],
    })
  })

  it('should fail when the organisation author is not found', async () => {
    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      author: organisationAuthor('missing-org'),
    })

    expect(Either.isLeft(result) && result.left).toContain('organisation')
  })

  it('should create a statement authored by an organisation', async () => {
    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      author: organisationAuthor(organisation.id),
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.author).toEqual({ kind: 'organisation', id: organisation.id })
    }
  })

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
      statedAt: 'pas-une-date',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.statedAt).toBeDefined()
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

  it('should create statement and award reputation on success', async () => {
    let reputationAdded = 0
    const { run, journal } = inMemoryUnitOfWork()

    const result = await createStatementUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
      runUnitOfWork: run,
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
      expect(result.right.author).toEqual({ kind: 'public_figure', id: 'figure-1' })
      expect(result.right.positionId).toBe('pos-1')
      expect(result.right.sourceName).toBe('Le Monde')
      expect(result.right.quote).toBe('Une citation suffisamment longue pour être valide.')
      expect(result.right.createdBy).toBe('abc')
      expect(journal.all().map((e) => [e.streamType, e.streamId, e.revision, e.type])).toEqual([
        ['statement', result.right.id, 1, 'StatementAdded'],
      ])
    }
    expect(reputationAdded).toBe(50)
  })
})
