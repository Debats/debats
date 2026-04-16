import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { deleteThemeUseCase } from './delete-theme'
import { Theme } from '../entities/theme'

const fakeThemeRepo = {
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null),
  findByIds: () => Effect.succeed([]),
  findById: (id: string) =>
    Effect.succeed(
      id === 'theme-1'
        ? ({
            id: 'theme-1',
            name: 'Économie',
            slug: 'economie',
            description: 'Description suffisante',
            createdBy: 'user-1',
            updatedBy: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as Theme)
        : null,
    ),
  create: (t: Theme) => Effect.succeed(t),
  update: (t: Theme) => Effect.succeed(t),
  delete: () => Effect.succeed(undefined as void),
  findAssignmentsBySubjectId: () => Effect.succeed([]),
  setAssignments: () => Effect.succeed(undefined as void),
}

describe('deleteThemeUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await deleteThemeUseCase({
      contributor: null,
      themeId: 'theme-1',
      themeRepo: fakeThemeRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation (requires Idéaliste)', async () => {
    const result = await deleteThemeUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      themeId: 'theme-1',
      themeRepo: fakeThemeRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Idéaliste')
    }
  })

  it('should fail when theme does not exist', async () => {
    const result = await deleteThemeUseCase({
      contributor: { id: 'abc', reputation: 10000 },
      themeId: 'nonexistent',
      themeRepo: fakeThemeRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should delete theme on success', async () => {
    let deletedId: string | null = null
    const repo = {
      ...fakeThemeRepo,
      delete: (id: string) => {
        deletedId = id
        return Effect.succeed(undefined as void)
      },
    }

    const result = await deleteThemeUseCase({
      contributor: { id: 'abc', reputation: 10000 },
      themeId: 'theme-1',
      themeRepo: repo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(deletedId).toBe('theme-1')
  })
})
