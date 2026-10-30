import { describe, it, expect } from 'vitest'
import { revisionOf } from './form-revision'

const formWith = (revision?: string) => {
  const form = new FormData()
  if (revision !== undefined) form.set('revision', revision)
  return form
}

describe('revisionOf', () => {
  it('reads the revision the form carries', () => {
    expect(revisionOf(formWith('7'))).toBe(7)
    expect(revisionOf(formWith('10'))).toBe(10)
  })

  it('throws on a form without the field: the page forgot to read the revision', () => {
    expect(() => revisionOf(formWith())).toThrow('carries no revision')
    expect(() => revisionOf(formWith(''))).toThrow('carries no revision')
  })

  it('throws on zero: no stream stands there, the page rendered nothing real', () => {
    expect(() => revisionOf(formWith('0'))).toThrow('carries no revision')
    expect(() => revisionOf(formWith('007'))).toThrow('carries no revision')
  })

  it('throws on a value that is not a revision', () => {
    expect(() => revisionOf(formWith('-1'))).toThrow('carries no revision')
    expect(() => revisionOf(formWith('1.5'))).toThrow('carries no revision')
    expect(() => revisionOf(formWith('abc'))).toThrow('carries no revision')
  })
})
