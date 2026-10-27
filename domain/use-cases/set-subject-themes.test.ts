import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { setSubjectThemesUseCase } from './set-subject-themes'
import { Theme, ThemeId, ThemeName, ThemeSlug } from '../entities/theme'
import { ThemeRepository } from '../repositories/theme-repository'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import {
  fakeSubjectSource,
  journalWithSubjects,
  sampleSubject,
  subjectParts,
} from './subject-test-helpers'

function fakeTheme(id: string, name: string): Theme {
  return Theme.make({
    id: ThemeId.make(id),
    name: ThemeName.make(name),
    slug: ThemeSlug.make(name.toLowerCase()),
    description: 'Une thématique de test.',
    createdBy: 'founder',
    updatedBy: 'founder',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

const economie = fakeTheme('11111111-1111-1111-1111-111111111111', 'Economie')
const societe = fakeTheme('22222222-2222-2222-2222-222222222222', 'Societe')
const subject = sampleSubject()

const themeRepo = {
  findByIds: (ids: string[]) =>
    Effect.succeed([economie, societe].filter((t) => ids.includes(t.id))),
} as unknown as ThemeRepository

const validParams = {
  subjectId: subject.id,
  themeIds: [economie.id, societe.id],
  primaryThemeId: economie.id,
  revision: 0,
  runUnitOfWork: inMemoryUnitOfWork().run,
  subjectSource: fakeSubjectSource([subjectParts(subject)]),
  themeRepo,
}

const eloquent = { id: 'abc', reputation: 10000 }

describe('setSubjectThemesUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await setSubjectThemesUseCase({ ...validParams, contributor: null })
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await setSubjectThemesUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when subject does not exist', async () => {
    const result = await setSubjectThemesUseCase({
      ...validParams,
      contributor: eloquent,
      subjectId: 'missing',
    })
    expect(result).toEqual(Either.left('Sujet introuvable.'))
  })

  it('should fail when a theme ID does not exist', async () => {
    const missing = ThemeId.make('33333333-3333-3333-3333-333333333333')
    const result = await setSubjectThemesUseCase({
      ...validParams,
      contributor: eloquent,
      themeIds: [economie.id, missing],
    })
    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('should fail when primaryThemeId is not in themeIds', async () => {
    const result = await setSubjectThemesUseCase({
      ...validParams,
      contributor: eloquent,
      themeIds: [economie.id],
      primaryThemeId: societe.id,
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when themes are selected but no primary theme', async () => {
    const result = await setSubjectThemesUseCase({
      ...validParams,
      contributor: eloquent,
      primaryThemeId: null,
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should record the whole set of themes with the primary flag, and tell the revision reached', async () => {
    const { run, journal } = await journalWithSubjects([subject, []])

    const result = await setSubjectThemesUseCase({
      ...validParams,
      contributor: eloquent,
      runUnitOfWork: run,
    })

    expect(result).toEqual(Either.right(2))
    expect(journal.all().at(-1)).toMatchObject({
      type: 'SubjectThemesSet',
      revision: 2,
      actorId: 'abc',
      payload: {
        themes: [
          { themeId: economie.id, isPrimary: true },
          { themeId: societe.id, isPrimary: false },
        ],
      },
    })
  })

  it('should allow empty list (remove all themes)', async () => {
    const { run, journal } = await journalWithSubjects([subject, []])

    const result = await setSubjectThemesUseCase({
      ...validParams,
      contributor: eloquent,
      themeIds: [],
      primaryThemeId: null,
      runUnitOfWork: run,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().at(-1)?.payload).toEqual({ themes: [] })
  })
})
