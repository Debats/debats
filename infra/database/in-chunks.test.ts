import { describe, it, expect } from 'vitest'
import { fetchInChunks } from './in-chunks'

describe('fetchInChunks', () => {
  it('queries the ids by slices and concatenates the rows in order', async () => {
    const calls: string[][] = []
    const rows = await fetchInChunks(
      ['a', 'b', 'c', 'd', 'e'],
      async (chunk) => {
        calls.push(chunk)
        return chunk.map((id) => id.toUpperCase())
      },
      2,
    )

    expect(calls).toEqual([['a', 'b'], ['c', 'd'], ['e']])
    expect(rows).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('never queries for no id', async () => {
    let called = false
    const rows = await fetchInChunks([], async () => {
      called = true
      return []
    })

    expect(called).toBe(false)
    expect(rows).toEqual([])
  })
})
