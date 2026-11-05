import { describe, expect, it } from 'vitest'
import { plural } from './plural'

describe('plural', () => {
  it('uses the singular for exactly one', () => {
    expect(plural(1, 'sujet', 'sujets')).toBe('sujet')
  })

  it('uses the singular for zero, as French does', () => {
    // « 0 prise de position », jamais « 0 prises de position »
    expect(plural(0, 'sujet', 'sujets')).toBe('sujet')
  })

  it('uses the plural beyond one', () => {
    expect(plural(2, 'sujet', 'sujets')).toBe('sujets')
    expect(plural(3, 'sujet', 'sujets')).toBe('sujets')
  })
})
