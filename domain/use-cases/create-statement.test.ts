import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer, Option } from 'effect'
import { createStatementUseCase } from './create-statement'
import { organisationAuthor, publicFigureAuthor } from '../entities/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { ArgumentRepository } from '../repositories/argument-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { fakeOrganisationRepo, sampleOrganisation } from './organisation-test-helpers'
import { fakeArgumentRepo, sampleArgument } from './argument-test-helpers'
import { Position, PositionId, PositionSlug, PositionTitle } from '../entities/position'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'
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

const fakePositionRepo: PositionRepository = {
  findById: () => Effect.succeed(fakePosition as Position | null),
  findBySubjectAndSlug: () => Effect.succeed(null as Position | null),
  findBySubjectId: () => Effect.succeed([fakePosition]),
}

const fakePublicFigureRepo = {
  findAll: () => Effect.succeed([fakePublicFigure]),
  searchByName: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(fakePublicFigure as PublicFigure | null),
  findById: () => Effect.succeed(fakePublicFigure as PublicFigure | null),
  findByWikipediaUrl: () => Effect.succeed(null as PublicFigure | null),
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
} as unknown as PublicFigureRepository

const organisation = sampleOrganisation()

const validParams = {
  subjectId: 'subject-1',
  author: publicFigureAuthor('figure-1'),
  positionId: 'pos-1',
  arguments: { argumentIds: [] as string[], newArguments: [] },
  statementType: 'declaration' as const,
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  statedAt: '2024-01-15',
}

/** The read side as the test wants it */
const fakes = (
  overrides: {
    positions?: PositionRepository
    figures?: PublicFigureRepository
    organisations?: OrganisationRepository
    arguments?: ArgumentRepository
  } = {},
) =>
  Layer.mergeAll(
    Layer.succeed(PositionRepository, overrides.positions ?? fakePositionRepo),
    Layer.succeed(PublicFigureRepository, overrides.figures ?? fakePublicFigureRepo),
    Layer.succeed(
      OrganisationRepository,
      overrides.organisations ?? fakeOrganisationRepo([organisation]),
    ),
    Layer.succeed(ArgumentRepository, overrides.arguments ?? fakeArgumentRepo()),
  )

const execute = runFormWith(fakes())

describe('createStatementUseCase', () => {
  it('should refuse arguments from a contributor below the Éloquent rank', async () => {
    const argument = sampleArgument()
    const result = await runFormWith(fakes({ arguments: fakeArgumentRepo([argument]) }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        arguments: { argumentIds: [argument.id], newArguments: [] },
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('should create proposed arguments and carry every argument in the event', async () => {
    const argument = sampleArgument()
    const { run, journal } = inMemoryUnitOfWork()
    const result = await runFormWith(fakes({ arguments: fakeArgumentRepo([argument]) }))(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        arguments: {
          argumentIds: [argument.id],
          newArguments: [
            { title: 'Liberté de choix', description: 'Chacun décide pour lui-même.' },
          ],
        },
      }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    const [proposed, statement] = journal.all()
    expect(proposed).toMatchObject({
      streamType: 'argument',
      type: 'ArgumentAdded',
      actorId: 'abc',
      payload: { title: 'Liberté de choix', slug: 'liberte-de-choix' },
    })
    expect(statement.payload).toMatchObject({ argumentIds: [argument.id, proposed.streamId] })
  })

  it('should fail when the organisation author is not found', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        author: organisationAuthor('missing-org'),
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('organisation')
  })

  it('should create a statement authored by an organisation', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        author: organisationAuthor(organisation.id),
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.author).toEqual({ kind: 'organisation', id: organisation.id })
    }
  })

  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await execute(createStatementUseCase({ ...validParams, contributor: null }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail with field error when quote is too short', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        quote: 'Court',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.quote).toBeDefined()
    }
  })

  it('should fail with field error when source name is empty', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        sourceName: '',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.sourceName).toBeDefined()
    }
  })

  it('should fail with field error when fact date is invalid', async () => {
    const result = await execute(
      createStatementUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 0 },
        statedAt: 'pas-une-date',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.statedAt).toBeDefined()
    }
  })

  it('should fail when public figure is not found', async () => {
    const result = await runFormWith(
      fakes({ figures: { ...fakePublicFigureRepo, findById: () => Effect.succeed(null) } }),
    )(createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('personnalité')
    }
  })

  it('should fail when position is not found', async () => {
    const result = await runFormWith(
      fakes({ positions: { ...fakePositionRepo, findById: () => Effect.succeed(null) } }),
    )(createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }))

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

    const result = await runFormWith(
      fakes({
        positions: {
          ...fakePositionRepo,
          findById: () => Effect.succeed(wrongPosition as Position | null),
        },
      }),
    )(createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('position')
      expect(result.left).toContain('sujet')
    }
  })

  it('should create statement and award reputation on success', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await execute(
      createStatementUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.author).toEqual({ kind: 'public_figure', id: 'figure-1' })
      expect(result.right.positionId).toBe('pos-1')
      expect(result.right.sourceName).toBe('Le Monde')
      expect(result.right.quote).toBe('Une citation suffisamment longue pour être valide.')
      expect(result.right.createdBy).toBe('abc')
      expect(deedsIn(journal).map((e) => [e.streamType, e.streamId, e.revision, e.type])).toEqual([
        ['statement', result.right.id, 1, 'StatementAdded'],
      ])
    }
    expect(grantsIn(journal)).toEqual([['abc', 'added_statement_validated', 50]])
  })
})
