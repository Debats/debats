import { describe, it, expect } from 'vitest'
import { groupStatementsByYear } from './statements-by-year'

const at = (statedAt: string, createdAt = '2024-06-01') => ({
  statement: { statedAt: new Date(statedAt), createdAt: new Date(createdAt) },
  label: `${statedAt}/${createdAt}`,
})

describe('groupStatementsByYear', () => {
  it('is empty without statements', () => {
    expect(groupStatementsByYear([])).toEqual([])
  })

  it('groups by the year stated, newest year first, newest statement first in each', () => {
    const years = groupStatementsByYear([
      at('2022-03-10'),
      at('2024-01-15'),
      at('2024-09-01'),
      at('2022-11-20'),
    ])

    expect(years.map((y) => [y.year, y.entries.map((e) => e.label)])).toEqual([
      [2024, ['2024-09-01/2024-06-01', '2024-01-15/2024-06-01']],
      [2022, ['2022-11-20/2024-06-01', '2022-03-10/2024-06-01']],
    ])
  })

  it('breaks a tie on the same day by the moment the statement was recorded, latest first', () => {
    const [year] = groupStatementsByYear([
      at('2024-01-15', '2024-06-01'),
      at('2024-01-15', '2024-06-02'),
    ])

    expect(year.entries.map((e) => e.label)).toEqual([
      '2024-01-15/2024-06-02',
      '2024-01-15/2024-06-01',
    ])
  })
})
