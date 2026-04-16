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

function fakeThemeRepo() {
  const savedAssignments: Array<{ subjectId: string; themeId: string; isPrimary: boolean }> = []

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
      findAssignmentsBySubjectId: () => Effect.succeed([]),
      setAssignments: (
        subjectId: string,
        assignments: Array<{ themeId: string; isPrimary: boolean }>,
      ) => {
        assignments.forEach((a) =>
          savedAssignments.push({ subjectId, themeId: a.themeId, isPrimary: a.isPrimary }),
        )
        return Effect.succeed(undefined as void)
      },
    },
    savedAssignments,
  }
}

describe('setSubjectThemesUseCase', () => {
  it('should fail when contributor is null', async () => {
    const { repo } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: null,
      subjectId: 'subject-1',
      themeIds: [ThemeId.make('theme-1')],
      primaryThemeId: null,
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('connecté')
    }
  })

  it('should fail when contributor lacks reputation', async () => {
    const { repo } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: { id: 'abc', reputation: 0 },
      subjectId: 'subject-1',
      themeIds: [ThemeId.make('theme-1')],
      primaryThemeId: null,
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('Éloquent')
    }
  })

  it('should fail when subject does not exist', async () => {
    const { repo } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId: 'nonexistent',
      themeIds: [ThemeId.make('theme-1')],
      primaryThemeId: null,
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when a theme ID does not exist', async () => {
    const { repo } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId: 'subject-1',
      themeIds: [ThemeId.make('theme-1'), ThemeId.make('nonexistent')],
      primaryThemeId: null,
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('introuvable')
    }
  })

  it('should fail when primaryThemeId is not in themeIds', async () => {
    const { repo } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId: 'subject-1',
      themeIds: [ThemeId.make('theme-1')],
      primaryThemeId: ThemeId.make('theme-2'),
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left).toContain('principale')
    }
  })

  it('should assign themes with primary flag', async () => {
    const { repo, savedAssignments } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId: 'subject-1',
      themeIds: [ThemeId.make('theme-1'), ThemeId.make('theme-2')],
      primaryThemeId: ThemeId.make('theme-1'),
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(savedAssignments).toEqual([
      { subjectId: 'subject-1', themeId: 'theme-1', isPrimary: true },
      { subjectId: 'subject-1', themeId: 'theme-2', isPrimary: false },
    ])
  })

  it('should allow no primary theme', async () => {
    const { repo, savedAssignments } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId: 'subject-1',
      themeIds: [ThemeId.make('theme-1'), ThemeId.make('theme-2')],
      primaryThemeId: null,
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(savedAssignments.every((a) => !a.isPrimary)).toBe(true)
  })

  it('should allow empty list (remove all themes)', async () => {
    const { repo, savedAssignments } = fakeThemeRepo()
    const result = await setSubjectThemesUseCase({
      contributor: { id: 'abc', reputation: 1000 },
      subjectId: 'subject-1',
      themeIds: [],
      primaryThemeId: null,
      themeRepo: repo,
      subjectRepo: fakeSubjectRepo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(savedAssignments).toEqual([])
  })
})
