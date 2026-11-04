import { describe, expect, it } from 'vitest'
import { dayKey, dayOf } from './day'

describe('the day of the site', () => {
  it('turns over in Paris, not in UTC', () => {
    // 23:30 UTC on 4 November is already the 5th in Paris
    expect(dayKey(new Date('2026-11-04T23:30:00Z'))).toBe('2026-11-05')
    expect(dayKey(new Date('2026-11-04T22:30:00Z'))).toBe('2026-11-04')
  })

  it('holds a day as the midnight that opens it, as a date column arrives', () => {
    expect(dayOf(new Date('2026-11-05T14:30:00Z'))).toEqual(new Date('2026-11-05T00:00:00Z'))
  })

  it('keeps every instant of one day on that day', () => {
    const day = dayOf(new Date('2026-06-15T10:00:00Z'))

    expect(dayOf(new Date('2026-06-15T04:00:00Z'))).toEqual(day)
    expect(dayOf(new Date('2026-06-15T21:59:00Z'))).toEqual(day)
  })
})
