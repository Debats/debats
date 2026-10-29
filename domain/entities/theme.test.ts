import { describe, it, expect } from 'vitest'
import { generateThemeSlug, ThemeName } from './theme'

describe('Theme entity', () => {
  it('derives the slug from the name, accents and symbols dropped', () => {
    expect(generateThemeSlug('Économie')).toBe('economie')
    expect(generateThemeSlug('Éducation & Recherche')).toBe('education-recherche')
  })

  it('takes a name of 2 to 50 characters', () => {
    expect(() => ThemeName.make('A')).toThrow()
    expect(() => ThemeName.make('A'.repeat(51))).toThrow()
    expect(ThemeName.make('Économie')).toBe('Économie')
  })
})
