import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { createPublicFigureUseCase } from './create-public-figure'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'

const fakePublicFigureRepo = {
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null as PublicFigure | null),
  findById: () => Effect.succeed(null as PublicFigure | null),
  findByWikipediaUrl: () => Effect.succeed(null as PublicFigure | null),
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
  findSummariesByActivity: () => Effect.succeed([]),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findSummariesByIds: () => Effect.succeed([]),
  findAllIds: () => Effect.succeed([]),
  findByLetter: () => Effect.succeed([]),
}

const fakeReputationRepo = {
  getReputation: () => Effect.succeed(0),
  recordEvent: () => Effect.succeed(undefined as void),
  getHistory: () => Effect.succeed([]),
}

const fakeWikipediaValidator = {
  validatePage: async () => ({ exists: true, isBiography: true }),
}

const validParams = {
  name: 'Jean Dupont',
  presentation: 'Un personnage public suffisamment connu pour apparaître.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
  websiteUrl: '',
  notorietySources: [] as string[],
  publicFigureRepo: fakePublicFigureRepo,
  reputationRepo: fakeReputationRepo,
  wikipediaValidator: fakeWikipediaValidator,
}

const validParamsWithoutWikipedia = {
  ...validParams,
  wikipediaUrl: '',
  notorietySources: [
    'https://lemonde.fr/article-notoriete',
    'https://liberation.fr/article-notoriete',
  ],
}

describe('createPublicFigureUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when reputation is insufficient (< 1000)', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 999 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail with field error when name is too short', async () => {
    const result = await createPublicFigureUseCase({
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
    const result = await createPublicFigureUseCase({
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
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaUrl: 'https://google.com',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toBeDefined()
    }
  })

  it('should fail with multiple field errors at once', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      name: 'A',
      presentation: 'Court',
      wikipediaUrl: 'invalid',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toBeDefined()
      expect(result.left.presentation).toBeDefined()
      expect(result.left.wikipediaUrl).toBeDefined()
    }
  })

  it('should fail with field error when no Wikipedia and no notoriety sources', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaUrl: '',
      notorietySources: [],
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.notorietySources).toContain('au moins 2')
    }
  })

  it('should fail with field error when no Wikipedia and only 1 notoriety source', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaUrl: '',
      notorietySources: ['https://lemonde.fr/article'],
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.notorietySources).toContain('au moins 2')
    }
  })

  it('should fail with field error when no Wikipedia and invalid notoriety URLs', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaUrl: '',
      notorietySources: ['pas-une-url', 'aussi-invalide'],
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.notorietySources).toContain('URLs valides')
    }
  })

  it('should fail when Wikipedia page does not exist', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: {
        validatePage: async () => ({ exists: false, isBiography: false }),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toContain('existe pas')
    }
  })

  it('should fail when Wikipedia page is not a biography', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: {
        validatePage: async () => ({ exists: true, isBiography: false }),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toContain('biographi')
    }
  })

  it('should accept gracefully when Wikipedia validator throws (network error)', async () => {
    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: {
        validatePage: async () => {
          throw new Error('Network timeout')
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
  })

  it('should succeed without Wikipedia when 2 valid notoriety sources', async () => {
    const throwingWikipediaValidator = {
      validatePage: async () => {
        throw new Error('Wikipedia validator should not be called')
      },
    }

    const result = await createPublicFigureUseCase({
      ...validParamsWithoutWikipedia,
      contributor: { id: 'abc', reputation: 1000 },
      wikipediaValidator: throwingWikipediaValidator,
    })

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

    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        findBySlug: () => Effect.succeed(existingFigure),
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toContain('existe déjà')
    }
  })

  it('should create public figure and award 50 pts on success', async () => {
    let totalReputationAdded = 0
    let createdFigure: PublicFigure | null = null

    const result = await createPublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        create: (f: PublicFigure) => {
          createdFigure = f
          return Effect.succeed(f)
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
      expect(result.right.name).toBe('Jean Dupont')
      expect(Option.getOrNull(result.right.wikipediaUrl)).toBe(
        'https://fr.wikipedia.org/wiki/Jean_Dupont',
      )
      expect(result.right.createdBy).toBe('abc')
    }

    expect(createdFigure).not.toBeNull()
    expect(totalReputationAdded).toBe(50)
  })

  it('should pass notoriety sources to created figure', async () => {
    let createdFigure: PublicFigure | null = null

    const result = await createPublicFigureUseCase({
      ...validParamsWithoutWikipedia,
      contributor: { id: 'abc', reputation: 1000 },
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        create: (f: PublicFigure) => {
          createdFigure = f
          return Effect.succeed(f)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    expect(createdFigure).not.toBeNull()
    expect(createdFigure!.notorietySources).toEqual([
      'https://lemonde.fr/article-notoriete',
      'https://liberation.fr/article-notoriete',
    ])
  })
})
