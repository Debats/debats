import { describe, it, expect } from 'vitest'
import { parseStatementsView, statementsViewHref } from './statements-view'

describe('parseStatementsView', () => {
  it('reads nothing as the list by subject, on every theme', () => {
    expect(parseStatementsView({})).toEqual({ order: 'subject' })
  })

  it('reads the chronological order and the theme', () => {
    expect(parseStatementsView({ tri: 'chronologique', theme: 'economie' })).toEqual({
      order: 'date',
      themeSlug: 'economie',
    })
  })

  it('ignores an order it does not know', () => {
    expect(parseStatementsView({ tri: 'alphabetique' })).toEqual({ order: 'subject' })
  })
})

describe('statementsViewHref', () => {
  it('leaves the defaults out of the address', () => {
    expect(statementsViewHref('/p/jean-dupont', { order: 'subject' })).toBe('/p/jean-dupont')
  })

  it('carries the order and the theme', () => {
    expect(statementsViewHref('/o/attac', { order: 'date', themeSlug: 'economie' })).toBe(
      '/o/attac?tri=chronologique&theme=economie',
    )
  })
})
