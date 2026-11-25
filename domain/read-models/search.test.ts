import { describe, expect, it } from 'vitest'
import { groupSearchHits, parseSearchQuery, SearchHit, searchHitHref, searchHref } from './search'

const hit = (
  kind: Exclude<SearchHit['kind'], 'position' | 'statement'>,
  title: string,
  slug = 'slug',
): SearchHit => ({ kind, id: 'id', title, slug, detail: null, excerpt: null })

const positionHit = (title: string, slug: string, subjectSlug: string): SearchHit => ({
  kind: 'position',
  id: 'id',
  title,
  slug,
  subjectSlug,
  detail: null,
  excerpt: null,
})

const statementHit = (
  authorKind: 'public_figure' | 'organisation',
  slug: string,
  subjectSlug: string,
): SearchHit => ({
  kind: 'statement',
  id: 'id',
  title: 'Auteur',
  slug,
  authorKind,
  subjectSlug,
  detail: 'Le SMIC',
  excerpt: '« Il faut augmenter le SMIC »',
})

describe('searchHitHref', () => {
  it('leads to the page of each kind, a position under its subject', () => {
    expect(searchHitHref(hit('subject', 'Le SMIC', 'le-smic'))).toBe('/s/le-smic')
    expect(searchHitHref(positionHit('Augmenter', 'augmenter', 'le-smic'))).toBe(
      '/s/le-smic/position/augmenter',
    )
    expect(searchHitHref(hit('public_figure', 'Simone Veil', 'simone-veil'))).toBe('/p/simone-veil')
    expect(searchHitHref(hit('organisation', 'Attac', 'attac'))).toBe('/o/attac')
    expect(searchHitHref(hit('argument', 'Coût', 'cout'))).toBe('/a/cout')
    expect(searchHitHref(hit('theme', 'Économie', 'economie'))).toBe('/themes/economie')
  })

  it('leads a statement to the page of its author on its subject', () => {
    expect(searchHitHref(statementHit('public_figure', 'simone-veil', 'le-smic'))).toBe(
      '/p/simone-veil/s/le-smic',
    )
    expect(searchHitHref(statementHit('organisation', 'attac', 'le-smic'))).toBe(
      '/o/attac/s/le-smic',
    )
  })

  it('leads a joint declaration to its page', () => {
    expect(searchHitHref(hit('joint_declaration', 'Manifeste', 'manifeste'))).toBe('/d/manifeste')
  })

  it('leads an occupation to the page of its family, whose slug it carries', () => {
    expect(searchHitHref(hit('occupation', 'Ministre', 'executif'))).toBe('/metiers/executif')
  })
})

describe('groupSearchHits', () => {
  it('groups by kind in the fixed order of kinds, keeping the order within a kind', () => {
    const groups = groupSearchHits([
      hit('occupation', 'o'),
      hit('argument', 'a'),
      hit('subject', 's2'),
      statementHit('public_figure', 'f', 's'),
      hit('public_figure', 'f'),
      hit('subject', 's1'),
    ])

    expect(groups.map((g) => [g.kind, g.hits.map((h) => h.title)])).toEqual([
      ['subject', ['s2', 's1']],
      ['public_figure', ['f']],
      ['statement', ['Auteur']],
      ['argument', ['a']],
      ['occupation', ['o']],
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
