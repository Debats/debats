import { describe, it, expect } from 'vitest'
import { authorRefOf } from './author-ref'

describe('authorRefOf', () => {
  it('reads a public figure and an organisation, and nothing else of them', () => {
    expect(authorRefOf({ kind: 'public_figure', id: 'f-1', name: 'dropped' })).toEqual({
      kind: 'public_figure',
      id: 'f-1',
    })
    expect(authorRefOf({ kind: 'organisation', id: 'o-1' })).toEqual({
      kind: 'organisation',
      id: 'o-1',
    })
  })

  it('reads no author in a kind the site does not know: none is assumed', () => {
    expect(authorRefOf({ kind: 'party', id: 'o-1' })).toBeNull()
    expect(authorRefOf({ id: 'f-1' })).toBeNull()
  })

  it('reads no author without an id, nor in what is not an object', () => {
    expect(authorRefOf({ kind: 'public_figure', id: '' })).toBeNull()
    expect(authorRefOf({ kind: 'public_figure', id: 12 })).toBeNull()
    expect(authorRefOf(null)).toBeNull()
    expect(authorRefOf('f-1')).toBeNull()
  })
})
