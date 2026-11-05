import { describe, it, expect } from 'vitest'
import { elide } from './elision'

describe('elide', () => {
  it('elides before a vowel', () => {
    expect(elide('de', 'Alma Dufour')).toBe('d’')
    expect(elide('de', 'Emmanuel Macron')).toBe('d’')
  })

  it('elides before an accented vowel', () => {
    expect(elide('de', 'Élisabeth Borne')).toBe('d’')
  })

  it('keeps the preposition and its space before a consonant', () => {
    expect(elide('de', 'Fabien Roussel')).toBe('de ')
  })

  it('does not elide before an h, aspirated or not', () => {
    expect(elide('de', 'Hélène Dupont')).toBe('de ')
  })
})
