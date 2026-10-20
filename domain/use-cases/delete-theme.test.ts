import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { deleteThemeUseCase } from './delete-theme'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { fakeThemeSource, journalWithThemes, sampleTheme } from './theme-test-helpers'

const idealiste = { id: 'abc', reputation: 10000 }
const theme = sampleTheme()

const validParams = {
  contributor: idealiste,
  themeId: theme.id,
  runUnitOfWork: inMemoryUnitOfWork().run,
  themeSource: fakeThemeSource([theme]),
}

describe('deleteThemeUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await deleteThemeUseCase({ ...validParams, contributor: null })

    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation (requires Idéaliste)', async () => {
    const result = await deleteThemeUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 1000 },
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('should fail when theme does not exist', async () => {
    const result = await deleteThemeUseCase({ ...validParams, themeId: 'nonexistent' })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the deletion in the stream', async () => {
    const unit = await journalWithThemes(theme)
    const result = await deleteThemeUseCase({ ...validParams, runUnitOfWork: unit.run })

    expect(Either.isRight(result)).toBe(true)
    expect(unit.journal.all().map((e) => [e.type, e.revision])).toEqual([
      ['ThemeAdded', 1],
      ['ThemeDeleted', 2],
    ])
  })

  it('imports a theme the journal does not know yet, then deletes it', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await deleteThemeUseCase({ ...validParams, runUnitOfWork: unit.run })

    expect(Either.isRight(result)).toBe(true)
    expect(unit.journal.all().map((e) => e.type)).toEqual(['ThemeImported', 'ThemeDeleted'])
  })

  it('refuses to delete a theme already gone', async () => {
    const unit = await journalWithThemes(theme)
    await deleteThemeUseCase({ ...validParams, runUnitOfWork: unit.run })
    const result = await deleteThemeUseCase({ ...validParams, runUnitOfWork: unit.run })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })
})
