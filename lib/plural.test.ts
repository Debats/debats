import { describe, expect, it } from 'vitest'
import { plural } from './plural'

describe('plural', () => {
  it('uses the singular for exactly one', () => {
    expect(plural(1, 'sujet', 'sujets')).toBe('sujet')
  })

  it('uses the plural for zero and for several', () => {
    expect(plural(0, 'sujet', 'sujets')).toBe('sujets')
    expect(plural(3, 'sujet', 'sujets')).toBe('sujets')
  })
})
