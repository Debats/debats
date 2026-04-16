import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { updatePublicFigureUseCase } from './update-public-figure'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'

const existingFigure = PublicFigure.make({
  id: PublicFigureId.make('figure-1'),
  name: PublicFigureName.make('Jean Dupont'),
  slug: PublicFigureSlug.make('jean-dupont'),
  presentation: 'Un personnage public suffisamment connu.',
  wikipediaUrl: Option.some('https://fr.wikipedia.org/wiki/Jean_Dupont'),
  notorietySources: [],
  websiteUrl: Option.none(),
  createdBy: 'author-id',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakePublicFigureRepo = {
  findAll: () => Effect.succeed([existingFigure]),
  searchByName: () => Effect.succeed([]),
  findBySlug: (slug: string) => Effect.succeed(slug === 'jean-dupont' ? existingFigure : null),
  findById: (id: string) => Effect.succeed(id === existingFigure.id ? existingFigure : null),
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
  figureId: existingFigure.id,
  name: 'Jean Dupont',
  presentation: 'Présentation mise à jour suffisamment longue.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/Jean_Dupont',
  websiteUrl: '',
  notorietySources: [],
  publicFigureRepo: fakePublicFigureRepo,
  reputationRepo: fakeReputationRepo,
  wikipediaValidator: fakeWikipediaValidator,
}

describe('updatePublicFigureUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 9999 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Idéaliste')
    }
  })

  it('should fail when figure does not exist', async () => {
    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      figureId: 'unknown-id',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when name is too short', async () => {
    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      name: 'A',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toBeDefined()
    }
  })

  it('should fail when new name conflicts with another figure', async () => {
    const otherFigure = PublicFigure.make({
      ...existingFigure,
      id: PublicFigureId.make('other-id'),
      name: PublicFigureName.make('Marie Martin'),
      slug: PublicFigureSlug.make('marie-martin'),
    })

    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      name: 'Marie Martin',
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        findBySlug: (slug: string) => {
          if (slug === 'marie-martin') return Effect.succeed(otherFigure)
          if (slug === 'jean-dupont') return Effect.succeed(existingFigure)
          return Effect.succeed(null)
        },
      },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.name).toContain('existe déjà')
    }
  })

  it('should allow keeping the same name without slug conflict', async () => {
    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
    })

    expect(Either.isRight(result)).toBe(true)
  })

  it('should fail when wikipedia URL is invalid', async () => {
    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      wikipediaUrl: 'https://not-wikipedia.com/page',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.wikipediaUrl).toBeDefined()
    }
  })

  it('should fail without wikipedia when less than 2 notoriety sources', async () => {
    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      wikipediaUrl: '',
      notorietySources: ['https://source1.com'],
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result) && typeof result.left !== 'string') {
      expect(result.left.notorietySources).toBeDefined()
    }
  })

  it('should update figure and award reputation on success', async () => {
    let updatedFigure: PublicFigure | null = null
    let reputationRecorded = false

    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      name: 'Jean-Pierre Dupont',
      presentation: 'Nouvelle présentation suffisamment longue.',
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        findBySlug: (slug: string) => {
          if (slug === 'jean-dupont') return Effect.succeed(existingFigure)
          return Effect.succeed(null)
        },
        update: (f: PublicFigure) => {
          updatedFigure = f
          return Effect.succeed(f)
        },
      },
      reputationRepo: {
        ...fakeReputationRepo,
        recordEvent: () => {
          reputationRecorded = true
          return Effect.succeed(undefined as void)
        },
      },
    })

    expect(Either.isRight(result)).toBe(true)
    expect(updatedFigure).not.toBeNull()
    expect(updatedFigure!.name).toBe('Jean-Pierre Dupont')
    expect(updatedFigure!.slug).toBe('jean-pierre-dupont')
    expect(updatedFigure!.presentation).toBe('Nouvelle présentation suffisamment longue.')
    expect(reputationRecorded).toBe(true)
  })
})
