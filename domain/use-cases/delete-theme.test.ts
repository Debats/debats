import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { deleteThemeUseCase } from './delete-theme'
import { runWith } from './command-test-helpers'
import { journalWithThemes, sampleTheme } from './theme-test-helpers'

const idealiste = { id: 'abc', reputation: 10000 }
const theme = sampleTheme()

const validParams = {
  contributor: idealiste,
  themeId: theme.id,
}

const execute = runWith(Layer.empty)

describe('deleteThemeUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await execute(deleteThemeUseCase({ ...validParams, contributor: null }))

    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation (requires Idéaliste)', async () => {
    const result = await execute(
      deleteThemeUseCase({ ...validParams, contributor: { id: 'abc', reputation: 1000 } }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('should fail when theme does not exist', async () => {
    const result = await execute(deleteThemeUseCase({ ...validParams, themeId: 'nonexistent' }))

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the deletion in the stream', async () => {
    const unit = await journalWithThemes(theme)
    const result = await execute(deleteThemeUseCase(validParams), unit.run)

    expect(Either.isRight(result)).toBe(true)
    expect(unit.journal.all().map((e) => [e.type, e.revision])).toEqual([
      ['ThemeAdded', 1],
      ['ThemeDeleted', 2],
    ])
  })

  it('refuses to delete a theme already gone', async () => {
    const unit = await journalWithThemes(theme)
    await execute(deleteThemeUseCase(validParams), unit.run)
    const result = await execute(deleteThemeUseCase(validParams), unit.run)

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })
})
