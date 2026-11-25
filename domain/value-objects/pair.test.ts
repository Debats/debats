import { describe, expect, it } from 'vitest'
import { orderedPair } from './pair'

describe('orderedPair', () => {
  it('names a pair the same way whichever comes first', () => {
    expect(orderedPair('b', 'a')).toEqual(['a', 'b'])
    expect(orderedPair('a', 'b')).toEqual(['a', 'b'])
  })
})
