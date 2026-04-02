import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { setSubjectThemesUseCase } from './set-subject-themes'
import { Theme, ThemeId, ThemeName, ThemeSlug, generateThemeSlug } from '../entities/theme'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../entities/subject'

function fakeTheme(id: string, name: string): Theme {
  return Theme.make({
    id: ThemeId.make(id),
    name: ThemeName.make(name),
    slug: generateThemeSlug(name),
    description: 'Description suffisante',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

const economie = fakeTheme('theme-1', 'Économie')
const societe = fakeTheme('theme-2', 'Société')
const environnement = fakeTheme('theme-3', 'Environnement')

const testSubject = Subject.make({
  id: SubjectId.make('subject-1'),
  title: SubjectTitle.make('Test Subject'),
  slug: SubjectSlug.make('test-subject'),
  presentation: 'Présentation test suffisamment longue',
  problem: 'Problème test suffisamment long',
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const fakeSubjectRepo = {
  findAll: () => Effect.succeed([]),
  findBySlug: () => Effect.succeed(null),
  findById: (id: string) => Effect.succeed(id === 'subject-1' ? testSubject : null),
  create: () => Effect.succeed(null as never),
  update: () => Effect.succeed(null as never),
  delete: () => Effect.succeed(undefined as void),
  getStats: () =>
    Effect.succeed({ subjectId: '', positionsCount: 0, publicFiguresCount: 0, statementsCount: 0 }),
  findSummariesByActivity: () => Effect.succeed([]),
  findSummariesByCreatedAt: () => Effect.succeed([]),
  findSummaryById: () => Effect.succeed(null),
  findAllIds: () => Effect.succeed([]),
}

function fakeThemeRepo(currentThemes: Theme[] = []) {
  const assigned: Array<{ subjectId: string; themeId: string }> = []
  const removed: Array<{ subjectId: string; themeId: string }> = []

  return {
    repo: {
      findAll: () => Effect.succeed([economie, societe, environnement]),
      findBySlug: () => Effect.succeed(null),
      findById: (id: string) =>
        Effect.succeed([economie, societe, environnement].find((t) => t.id === id) ?? null),
      findByIds: (ids: string[]) =>
        Effect.succeed(
          [economie, societe, environnement].filter((t) => ids.includes(t.id as string)),
        ),
      create: (t: Theme) => Effect.succeed(t),
      update: (t: Theme) => Effect.succeed(t),
      delete: () => Effect.succeed(undefined as void),
      findBySubjectId: () => Effect.succeed(currentThemes),
      assignToSubject: (subjectId: string, themeId: string) => {
        assigned.push({ subjectId, themeId })
        return Effect.succeed(undefined as void)
      },
      removeFromSubject: (subjectId: string, themeId: string) => {
        removed.push({ subjectId, themeId })
        return Effect.succeed(undefined as void)
      },
    },
    assigned,
    removed,
  }
}

const validParams = (currentThemes: Theme[] = []) => {
  const { repo, assigned, removed } = fakeThemeRepo(currentThemes)
  return {
    params: {
      subjectId: 'subject-1',
      themeIds: [ThemeId.make('theme-1'), ThemeId.make('theme-2')],
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    },
    assigned,
    removed,
  }
}

describe('setSubjectThemesUseCase', () => {
  it('should fail when contributor is null', async () => {
    const { params } = validParams()
    const result = await setSubjectThemesUseCase({ ...params, contributor: null })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation (requires Éloquent)', async () => {
    const { params } = validParams()
    const result = await setSubjectThemesUseCase({
      ...params,
      contributor: { id: 'abc', reputation: 0 },
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail when subject does not exist', async () => {
    const { params } = validParams()
    const result = await setSubjectThemesUseCase({
      ...params,
      contributor: { id: 'abc', reputation: 1000 },
      subjectId: 'nonexistent',
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when a theme ID does not exist', async () => {
    const { params } = validParams()
    const result = await setSubjectThemesUseCase({
      ...params,
      contributor: { id: 'abc', reputation: 1000 },
      themeIds: [ThemeId.make('theme-1'), ThemeId.make('nonexistent')],
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should assign new themes and remove old ones', async () => {
    const { params, assigned, removed } = validParams([economie])

    const result = await setSubjectThemesUseCase({
      ...params,
      contributor: { id: 'abc', reputation: 1000 },
      themeIds: [ThemeId.make('theme-2'), ThemeId.make('theme-3')],
    })

    expect(Either.isRight(result)).toBe(true)
    expect(removed).toEqual([{ subjectId: 'subject-1', themeId: 'theme-1' }])
    expect(assigned).toEqual([
      { subjectId: 'subject-1', themeId: 'theme-2' },
      { subjectId: 'subject-1', themeId: 'theme-3' },
    ])
  })

  it('should not touch themes that are already assigned', async () => {
    const { params, assigned, removed } = validParams([economie, societe])

    const result = await setSubjectThemesUseCase({
      ...params,
      contributor: { id: 'abc', reputation: 1000 },
      themeIds: [ThemeId.make('theme-1'), ThemeId.make('theme-2'), ThemeId.make('theme-3')],
    })

    expect(Either.isRight(result)).toBe(true)
    expect(removed).toEqual([])
    expect(assigned).toEqual([{ subjectId: 'subject-1', themeId: 'theme-3' }])
  })

  it('should allow setting an empty list (remove all themes)', async () => {
    const { params, assigned, removed } = validParams([economie])

    const result = await setSubjectThemesUseCase({
      ...params,
      contributor: { id: 'abc', reputation: 1000 },
      themeIds: [],
    })

    expect(Either.isRight(result)).toBe(true)
    expect(removed).toEqual([{ subjectId: 'subject-1', themeId: 'theme-1' }])
    expect(assigned).toEqual([])
  })
})
