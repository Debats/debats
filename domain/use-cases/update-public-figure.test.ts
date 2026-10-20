import { describe, it, expect } from 'vitest'
import { Either, Effect, Option } from 'effect'
import { updatePublicFigureUseCase } from './update-public-figure'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import {
  fakePublicFigureSource,
  figureParts,
  journalWithFigures,
} from './public-figure-test-helpers'

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
  getStats: () =>
    Effect.succeed({ publicFigureId: '', subjectsCount: 0, positionsCount: 0, statementsCount: 0 }),
  findSummariesByActivity: () => Effect.succeed([]),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findSummariesByIds: () => Effect.succeed([]),
  findIndexEntries: () => Effect.succeed([]),
  findAllIds: () => Effect.succeed([]),
  findByLetter: () => Effect.succeed([]),
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
  runUnitOfWork: inMemoryUnitOfWork().run,
  publicFigureSource: fakePublicFigureSource([figureParts(existingFigure)]),
  publicFigureRepo: fakePublicFigureRepo,
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
    const { run, journal } = await journalWithFigures(existingFigure)

    const result = await updatePublicFigureUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      name: 'Jean-Pierre Dupont',
      presentation: 'Nouvelle présentation suffisamment longue.',
      runUnitOfWork: run,
      publicFigureRepo: {
        ...fakePublicFigureRepo,
        findBySlug: (slug: string) => {
          if (slug === 'jean-dupont') return Effect.succeed(existingFigure)
          return Effect.succeed(null)
        },
      },
    })

    expect(Either.isRight(result) && result.right).toMatchObject({
      id: existingFigure.id,
      name: 'Jean-Pierre Dupont',
      slug: 'jean-pierre-dupont',
      presentation: 'Nouvelle présentation suffisamment longue.',
      createdBy: 'author-id',
    })
    expect(deedsIn(journal).at(-1)).toMatchObject({
      type: 'PublicFigureEdited',
      revision: 2,
      actorId: 'abc',
    })
    expect(grantsIn(journal)).toEqual([['abc', 'edited_personality', 5]])
  })
})
