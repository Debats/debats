import { describe, expect, it } from 'vitest'
import {
  addStatementHref,
  argumentHref,
  figureHref,
  figureOnSubjectHref,
  occupationFamilyHref,
  organisationHref,
  organisationOnSubjectHref,
  positionHref,
  statementEditHref,
  subjectHref,
  themeHref,
} from './hrefs'

describe('the addresses of the site', () => {
  it('gives each entity the page its slug answers to', () => {
    expect(subjectHref('le-smic')).toBe('/s/le-smic')
    expect(figureHref('simone-veil')).toBe('/p/simone-veil')
    expect(organisationHref('attac')).toBe('/o/attac')
    expect(themeHref('economie')).toBe('/themes/economie')
    expect(argumentHref({ slug: 'dignite-de-la-personne' })).toBe(
      '/arguments/dignite-de-la-personne',
    )
    expect(occupationFamilyHref({ slug: 'executif' })).toBe('/metiers/executif')
  })

  it('puts a position under its subject, by its own slug', () => {
    expect(positionHref('le-smic', 'augmenter')).toBe('/s/le-smic/position/augmenter')
  })

  it('puts an author on a subject under the author', () => {
    expect(figureOnSubjectHref('simone-veil', 'le-smic')).toBe('/p/simone-veil/s/le-smic')
    expect(organisationOnSubjectHref('attac', 'le-smic')).toBe('/o/attac/s/le-smic')
  })

  it('opens the new statement form on a subject for who is signed in', () => {
    expect(addStatementHref({ id: 'abc', title: 'L’âge & la retraite' }, true)).toBe(
      '/nouvelle-prise-de-position?subjectId=abc&subjectTitle=L%E2%80%99%C3%A2ge%20%26%20la%20retraite',
    )
  })

  it('sends a visitor who wants to add a statement to the page that explains how to contribute', () => {
    expect(addStatementHref({ id: 'abc', title: 'Le SMIC' }, false)).toBe('/contribuer')
  })

  it('edits a statement by its id', () => {
    expect(statementEditHref('abc')).toBe('/prise-de-position/abc/modifier')
  })
})
