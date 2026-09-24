import { describe, expect, it } from 'vitest'
import { formatDate, formatShortDate } from './format-date'

describe('formatDate', () => {
  it('writes the long French form', () => {
    expect(formatDate(new Date(2023, 10, 14))).toBe('14 novembre 2023')
  })

  it('does not zero-pad the day', () => {
    expect(formatDate(new Date(2021, 1, 3))).toBe('3 février 2021')
  })
})

describe('formatShortDate', () => {
  it('abbreviates the month in French', () => {
    expect(formatShortDate(new Date(2023, 10, 14))).toBe('14 nov. 2023')
  })
})
