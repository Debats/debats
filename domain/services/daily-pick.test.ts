import { describe, it, expect } from 'vitest'
import { dailyIndex, dailyPick } from './daily-pick'

const ids = (...names: string[]) => names.map((id) => ({ id }))
const idOf = (item: { id: string }) => item.id

describe('dailyPick', () => {
  const noon = new Date('2026-11-13T12:00:00Z')

  it('picks nothing among nothing', () => {
    expect(dailyPick([], idOf, noon)).toBeNull()
  })

  it('picks the same item all day, whatever order the items come in', () => {
    const items = ids('a', 'b', 'c', 'd', 'e')

    const morning = dailyPick(items, idOf, new Date('2026-11-13T07:00:00Z'))
    const evening = dailyPick([...items].reverse(), idOf, new Date('2026-11-13T20:00:00Z'))

    expect(evening).toEqual(morning)
  })

  it('does not pick the same item every day', () => {
    const items = ids('a', 'b', 'c', 'd', 'e')
    const picked = new Set(
      Array.from(
        { length: 30 },
        (_, day) => dailyPick(items, idOf, new Date(Date.UTC(2026, 0, day + 1, 12)))?.id,
      ),
    )

    expect(picked.size).toBeGreaterThan(1)
  })

  it('gives every item its days: none is left out of a year of draws', () => {
    const items = ids('a', 'b', 'c', 'd', 'e')
    const picked = new Set(
      Array.from(
        { length: 365 },
        (_, day) => dailyPick(items, idOf, new Date(Date.UTC(2026, 0, day + 1, 12)))?.id,
      ),
    )

    expect(picked.size).toBe(items.length)
  })

  it('keeps its pick when another item joins during the day, unless the newcomer is picked', () => {
    const items = ids('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h')

    for (let day = 1; day <= 60; day++) {
      const instant = new Date(Date.UTC(2026, 0, day, 12))
      const before = dailyPick(items, idOf, instant)
      const after = dailyPick([...items, { id: 'newcomer' }], idOf, instant)

      expect([before?.id, 'newcomer']).toContain(after?.id)
    }
  })
})

describe('dailyIndex', () => {
  it('should return the same index for the same date', () => {
    const date = new Date('2026-03-26')
    const a = dailyIndex(10, date)
    const b = dailyIndex(10, date)
    expect(a).toBe(b)
  })

  it('should return different indices for different dates', () => {
    const results = new Set(
      Array.from({ length: 30 }, (_, i) => dailyIndex(100, new Date(2026, 0, i + 1))),
    )
    // Not all 30 days should pick the same index
    expect(results.size).toBeGreaterThan(1)
  })

  it('should return 0 for count 0', () => {
    expect(dailyIndex(0, new Date(2026, 0, 1))).toBe(0)
  })

  it('should always return a valid index', () => {
    for (let i = 0; i < 365; i++) {
      const idx = dailyIndex(5, new Date(2026, 0, i + 1))
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(5)
    }
  })
})
