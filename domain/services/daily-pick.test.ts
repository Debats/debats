import { describe, it, expect } from 'vitest'
import { dailyIndex } from './daily-pick'

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
    expect(dailyIndex(0)).toBe(0)
  })

  it('should always return a valid index', () => {
    for (let i = 0; i < 365; i++) {
      const idx = dailyIndex(5, new Date(2026, 0, i + 1))
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(5)
    }
  })
})
