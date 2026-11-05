import { describe, it, expect } from 'vitest'
import { elided, prepositionBefore } from './elision'

describe('elided', () => {
  it('elides before a vowel', () => {
    expect(elided('de', 'Alma Dufour')).toBe('d’Alma Dufour')
    expect(elided('de', 'Emmanuel Macron')).toBe('d’Emmanuel Macron')
  })

  it('elides before an accented vowel', () => {
    expect(elided('de', 'Élisabeth Borne')).toBe('d’Élisabeth Borne')
  })

  it('keeps the preposition and its space before a consonant', () => {
    expect(elided('de', 'Fabien Roussel')).toBe('de Fabien Roussel')
  })

  it('does not elide before an h, aspirated or not', () => {
    expect(elided('de', 'Hélène Dupont')).toBe('de Hélène Dupont')
    expect(elided('de', 'François Hollande')).toBe('de François Hollande')
  })
})

describe('prepositionBefore', () => {
  it('gives the preposition alone, for a name the caller writes itself', () => {
    expect(prepositionBefore('de', 'Alma Dufour')).toBe('d’')
    expect(prepositionBefore('de', 'Fabien Roussel')).toBe('de ')
  })
})
