import { describe, expect, it } from 'vitest'
import { groupSearchHits, parseSearchQuery, SearchHit, searchHitHref, searchHref } from './search'

const hit = (kind: SearchHit['kind'], title: string, slug = 'slug', id = 'id'): SearchHit => ({
  kind,
  id,
  title,
  slug,
  detail: null,
})

describe('searchHitHref', () => {
  it('leads to the page of each kind, a position under its subject', () => {
    expect(searchHitHref(hit('subject', 'Le SMIC', 'le-smic'))).toBe('/s/le-smic')
    expect(searchHitHref(hit('position', 'Augmenter', 'le-smic', 'p-1'))).toBe(
      '/s/le-smic/position/p-1',
    )
    expect(searchHitHref(hit('public_figure', 'Simone Veil', 'simone-veil'))).toBe('/p/simone-veil')
    expect(searchHitHref(hit('organisation', 'Attac', 'attac'))).toBe('/o/attac')
    expect(searchHitHref(hit('argument', 'Coût', 'cout'))).toBe('/arguments/cout')
    expect(searchHitHref(hit('theme', 'Économie', 'economie'))).toBe('/themes/economie')
  })
})

describe('groupSearchHits', () => {
  it('groups by kind in the fixed order of kinds, keeping the order within a kind', () => {
    const groups = groupSearchHits([
      hit('argument', 'a'),
      hit('subject', 's2'),
      hit('public_figure', 'f'),
      hit('subject', 's1'),
    ])

    expect(groups.map((g) => [g.kind, g.hits.map((h) => h.title)])).toEqual([
      ['subject', ['s2', 's1']],
      ['public_figure', ['f']],
      ['argument', ['a']],
    ])
  })

  it('is empty without hits', () => {
    expect(groupSearchHits([])).toEqual([])
  })
})

describe('parseSearchQuery', () => {
  it('trims and bounds what was typed', () => {
    expect(parseSearchQuery('  smic ')).toBe('smic')
    expect(parseSearchQuery('a'.repeat(150))).toHaveLength(100)
  })

  it('refuses a query too short to mean anything', () => {
    expect(parseSearchQuery(' a ')).toBeNull()
    expect(parseSearchQuery('')).toBeNull()
    expect(parseSearchQuery(undefined)).toBeNull()
  })
})

describe('searchHref', () => {
  it('carries the query, encoded', () => {
    expect(searchHref('taxe Zucman ')).toBe('/recherche?q=taxe%20Zucman')
  })
})
