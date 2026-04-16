import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { createThemeUseCase } from './create-theme'
import { Theme } from '../entities/theme'

const fakeThemeRepo = {
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null),
  findById: () => Effect.succeed(null),
  findByIds: () => Effect.succeed([]),
  create: (theme: Theme) => Effect.succeed(theme),
  update: (theme: Theme) => Effect.succeed(theme),
  delete: () => Effect.succeed(undefined as void),
  findAssignmentsBySubjectId: () => Effect.succeed([]),
  setAssignments: () => Effect.succeed(undefined as void),
}

const validParams = {
  name: 'Économie',
  description: 'Fiscalité, emploi, finances publiques, marché du travail',
  themeRepo: fakeThemeRepo,
}

describe('createThemeUseCase', () => {
  it('should fail when contributor is null (not authenticated)', async () => {
    const result = await createThemeUseCase({
      ...validParams,
      contributor: null,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation (requires Idéaliste)', async () => {
    const result = await createThemeUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Idéaliste')
    }
  })

  it('should fail when name is too short', async () => {
    const result = await createThemeUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      name: 'A',
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when description is too short', async () => {
    const result = await createThemeUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      description: 'Court',
    })

    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when a theme with the same slug already exists', async () => {
    const existingTheme = {
      ...fakeThemeRepo,
      findBySlug: () =>
        Effect.succeed({
          id: 'existing',
          name: 'Économie',
          slug: 'economie',
          description: 'Déjà existante',
          createdBy: 'other',
          updatedBy: 'other',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Theme),
    }

    const result = await createThemeUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      themeRepo: existingTheme,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('existe déjà')
    }
  })

  it('should create theme on success', async () => {
    const result = await createThemeUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
    })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.name).toBe('Économie')
      expect(result.right.slug).toBe('economie')
      expect(result.right.createdBy).toBe('abc')
    }
  })
})
