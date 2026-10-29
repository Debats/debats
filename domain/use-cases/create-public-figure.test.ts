import { describe, it, expect } from 'vitest'
import { Either, Effect, Layer, Option } from 'effect'
import { createPublicFigureUseCase } from './create-public-figure'
import { PublicFigure } from '../entities/public-figure'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'

const fakePublicFigureRepo = {
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null as PublicFigure | null),
  findById: () => Effect.succeed(null as PublicFigure | null),
  findByWikipediaUrl: () => Effect.succeed(null as PublicFigure | null),
  searchByName: () => Effect.succeed([]),
  getStats: () =>
    Effect.succeed({
      publicFigureId: '',
      subjectsCount: 0,
      positionsCount: 0,
      statementsCount: 0,
    }),
  findSummariesByActivity: () => Effect.succeed([]),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findSummariesByIds: () => Effect.succeed([]),
  findIndexEntries: () => Effect.succeed([]),
  findAllIds: () => Effect.succeed([]),
  findByLetter: () => Effect.succeed([]),
} as unknown as PublicFigureRepository

const fakeWikipediaValidator: WikipediaValidator = {
  validatePage: async () => ({ exists: true, isBiography: true }),
}

const validParams = {
  name: 'Jean Dupont',
  presentation: 'Un personnage public suffisamment connu pour apparaître.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
  websiteUrl: '',
  notorietySources: [] as string[],
}

const validParamsWithoutWikipedia = {
  ...validParams,
  wikipediaUrl: '',
  notorietySources: [
    'https://lemonde.fr/article-notoriete',
    'https://liberation.fr/article-notoriete',
  ],
}

/** The read side and Wikipedia as the test wants them */
const fakes = (
  overrides: { figures?: PublicFigureRepository; wikipedia?: WikipediaValidator } = {},
) =>
  Layer.mergeAll(
    Layer.succeed(PublicFigureRepository, overrides.figures ?? fakePublicFigureRepo),
    Layer.succeed(WikipediaValidator, overrides.wikipedia ?? fakeWikipediaValidator),
  )

const execute = runFormWith(fakes())

describe('createPublicFigureUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await execute(createPublicFigureUseCase({ ...validParams, contributor: null }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when reputation is insufficient (< 1000)', async () => {
    const result = await execute(
      createPublicFigureUseCase({ ...validParams, contributor: { id: 'abc', reputation: 999 } }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail with field error when name is too short', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        name: 'A',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toBeDefined()
    }
  })

  it('should fail with field error when presentation is too short', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        presentation: 'Court',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.presentation).toBeDefined()
    }
  })

  it('should fail with field error when Wikipedia URL is invalid', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        wikipediaUrl: 'https://google.com',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toBeDefined()
    }
  })

  it('should fail with multiple field errors at once', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        name: 'A',
        presentation: 'Court',
        wikipediaUrl: 'invalid',
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toBeDefined()
      expect(result.left.presentation).toBeDefined()
      expect(result.left.wikipediaUrl).toBeDefined()
    }
  })

  it('should fail with field error when no Wikipedia and no notoriety sources', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        wikipediaUrl: '',
        notorietySources: [],
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.notorietySources).toContain('au moins 2')
    }
  })

  it('should fail with field error when no Wikipedia and only 1 notoriety source', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        wikipediaUrl: '',
        notorietySources: ['https://lemonde.fr/article'],
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.notorietySources).toContain('au moins 2')
    }
  })

  it('should fail with field error when no Wikipedia and invalid notoriety URLs', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 1000 },
        wikipediaUrl: '',
        notorietySources: ['pas-une-url', 'aussi-invalide'],
      }),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.notorietySources).toContain('URLs valides')
    }
  })

  it('should fail when Wikipedia page does not exist', async () => {
    const result = await runFormWith(
      fakes({ wikipedia: { validatePage: async () => ({ exists: false, isBiography: false }) } }),
    )(createPublicFigureUseCase({ ...validParams, contributor: { id: 'abc', reputation: 1000 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toContain('existe pas')
    }
  })

  it('should fail when Wikipedia page is not a biography', async () => {
    const result = await runFormWith(
      fakes({ wikipedia: { validatePage: async () => ({ exists: true, isBiography: false }) } }),
    )(createPublicFigureUseCase({ ...validParams, contributor: { id: 'abc', reputation: 1000 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toContain('biographi')
    }
  })

  it('should accept gracefully when Wikipedia validator throws (network error)', async () => {
    const result = await runFormWith(
      fakes({
        wikipedia: {
          validatePage: async () => {
            throw new Error('Network timeout')
          },
        },
      }),
    )(createPublicFigureUseCase({ ...validParams, contributor: { id: 'abc', reputation: 1000 } }))

    expect(Either.isRight(result)).toBe(true)
  })

  it('should succeed without Wikipedia when 2 valid notoriety sources', async () => {
    const throwingWikipediaValidator = {
      validatePage: async () => {
        throw new Error('Wikipedia validator should not be called')
      },
    }

    const result = await runFormWith(fakes({ wikipedia: throwingWikipediaValidator }))(
      createPublicFigureUseCase({
        ...validParamsWithoutWikipedia,
        contributor: { id: 'abc', reputation: 1000 },
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(Option.isNone(result.right.wikipediaUrl)).toBe(true)
    }
  })

  it('should fail when a public figure with the same name already exists', async () => {
    const existingFigure = {
      id: 'existing-id',
      name: 'Jean Dupont',
      slug: 'jean-dupont',
    } as PublicFigure

    const result = await runFormWith(
      fakes({
        figures: { ...fakePublicFigureRepo, findBySlug: () => Effect.succeed(existingFigure) },
      }),
    )(createPublicFigureUseCase({ ...validParams, contributor: { id: 'abc', reputation: 1000 } }))

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toContain('existe déjà')
    }
  })

  it('should create public figure and award 50 pts on success', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await execute(
      createPublicFigureUseCase({ ...validParams, contributor: { id: 'abc', reputation: 1000 } }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.name).toBe('Jean Dupont')
      expect(Option.getOrNull(result.right.wikipediaUrl)).toBe(
        'https://fr.wikipedia.org/wiki/Jean_Dupont',
      )
      expect(result.right.createdBy).toBe('abc')
      expect(deedsIn(journal).map((e) => [e.streamType, e.streamId, e.revision, e.type])).toEqual([
        ['public_figure', result.right.id, 1, 'PublicFigureAdded'],
      ])
    }

    expect(grantsIn(journal)).toEqual([['abc', 'added_personality_validated', 50]])
  })

  it('should pass notoriety sources to created figure', async () => {
    const result = await execute(
      createPublicFigureUseCase({
        ...validParamsWithoutWikipedia,
        contributor: { id: 'abc', reputation: 1000 },
      }),
    )

    expect(Either.isRight(result) && result.right.notorietySources).toEqual([
      'https://lemonde.fr/article-notoriete',
      'https://liberation.fr/article-notoriete',
    ])
  })
})
