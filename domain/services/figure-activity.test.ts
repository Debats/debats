import { describe, expect, it } from 'vitest'
import { activityPeriod, statementsPerYear, themeDistribution } from './figure-activity'

const d = (iso: string) => new Date(iso)

describe('statementsPerYear', () => {
  it('counts statements by year over a continuous range, filling empty years', () => {
    const dates = [d('2020-10-02'), d('2022-03-17'), d('2022-04-20'), d('2025-03-17')]
    expect(statementsPerYear(dates)).toEqual([
      { year: 2020, count: 1 },
      { year: 2021, count: 0 },
      { year: 2022, count: 2 },
      { year: 2023, count: 0 },
      { year: 2024, count: 0 },
      { year: 2025, count: 1 },
    ])
  })

  it('returns a single bucket for a single year', () => {
    expect(statementsPerYear([d('2023-01-01'), d('2023-12-31')])).toEqual([
      { year: 2023, count: 2 },
    ])
  })

  it('returns nothing without statements', () => {
    expect(statementsPerYear([])).toEqual([])
  })
})

describe('activityPeriod', () => {
  it('spans the first and last statement years', () => {
    expect(activityPeriod([d('2022-03-17'), d('2020-10-02'), d('2025-03-17')])).toEqual({
      from: 2020,
      to: 2025,
    })
  })

  it('is null without statements', () => {
    expect(activityPeriod([])).toBeNull()
  })
})

describe('themeDistribution', () => {
  const themes = [
    { id: 't-eco', name: 'Économie', slug: 'economie' },
    { id: 't-soc', name: 'Société', slug: 'societe' },
    { id: 't-env', name: 'Environnement', slug: 'environnement' },
  ]
  const links = [
    { themeId: 't-eco', subjectId: 's1' },
    { themeId: 't-eco', subjectId: 's2' },
    { themeId: 't-soc', subjectId: 's3' },
    { themeId: 't-env', subjectId: 's9' },
  ]

  it('counts the subjects of a figure per primary theme, most frequent first', () => {
    expect(themeDistribution(['s1', 's2', 's3'], links, themes)).toEqual([
      { theme: themes[0], count: 2 },
      { theme: themes[1], count: 1 },
    ])
  })

  it('ignores subjects without a primary theme and themes without subjects', () => {
    expect(themeDistribution(['s3', 's-orphan'], links, themes)).toEqual([
      { theme: themes[1], count: 1 },
    ])
  })

  it('counts each subject once even if listed twice', () => {
    expect(themeDistribution(['s1', 's1'], links, themes)).toEqual([{ theme: themes[0], count: 1 }])
  })
})
