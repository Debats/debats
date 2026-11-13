import { describe, it, expect } from 'vitest'
import { anotherIndex } from './another-index'

describe('anotherIndex', () => {
  it('never lands on the current index when there is a choice', () => {
    const draws = Array.from({ length: 200 }, () => anotherIndex(2, 5))

    expect(draws).not.toContain(2)
    expect(draws.every((index) => index >= 0 && index < 5)).toBe(true)
  })

  it('stays where it is when there is nothing else to pick', () => {
    expect(anotherIndex(0, 1)).toBe(0)
    expect(anotherIndex(0, 0)).toBe(0)
  })
})
