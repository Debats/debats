import { describe, expect, it } from 'vitest'
import { authorsTally, elapsed, sizeFor, slideFileName } from './carousel-image'

describe('sizeFor', () => {
  const steps = [
    [10, 100],
    [20, 60],
  ] as const

  it('takes the first step the text holds in', () => {
    expect(sizeFor('court', steps, 40)).toBe(100)
    expect(sizeFor('x'.repeat(10), steps, 40)).toBe(100)
    expect(sizeFor('x'.repeat(11), steps, 40)).toBe(60)
  })

  it('falls back on the smallest size past the last step', () => {
    expect(sizeFor('x'.repeat(21), steps, 40)).toBe(40)
  })
})

describe('slideFileName', () => {
  it('numbers the slides from one, on two digits, so that they sort as they are swiped', () => {
    expect(slideFileName('le-nucleaire', 0)).toBe('debats-le-nucleaire-01.png')
    expect(slideFileName('le-nucleaire', 11)).toBe('debats-le-nucleaire-12.png')
  })
})

describe('elapsed', () => {
  const between = (from: string, to: string) => elapsed(new Date(from), new Date(to))

  it('counts whole years and months', () => {
    expect(between('2022-02-09', '2026-09-09')).toBe('4 ans et 7 mois')
    expect(between('2022-02-09', '2023-02-09')).toBe('1 an')
    expect(between('2022-02-09', '2022-05-20')).toBe('3 mois')
  })

  it('does not count a month that is not over', () => {
    expect(between('2022-02-09', '2022-04-08')).toBe('1 mois')
  })

  it('says so when less than a month went by', () => {
    expect(between('2022-02-09', '2022-02-20')).toBe('moins d’un mois')
  })
})

describe('authorsTally', () => {
  it('names each kind of author with its count, agreed in number', () => {
    expect(authorsTally(17, 3, ' · ')).toBe('17 personnalités · 3 organisations')
    expect(authorsTally(1, 1, ' et ')).toBe('1 personnalité et 1 organisation')
  })

  it('does not name a kind nobody belongs to', () => {
    expect(authorsTally(4, 0, ' · ')).toBe('4 personnalités')
    expect(authorsTally(0, 2, ' · ')).toBe('2 organisations')
  })
})
