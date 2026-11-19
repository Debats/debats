import { describe, expect, it } from 'vitest'
import {
  addStatementHref,
  argumentHref,
  figureHref,
  figureOnSubjectHref,
  newStatementOfFigureHref,
  newStatementOfOrganisationHref,
  newStatementOnPositionHref,
  occupationFamilyHref,
  organisationHref,
  organisationOnSubjectHref,
  positionHref,
  signJointDeclarationHref,
  statementEditHref,
  subjectHref,
  subjectShareSlideHref,
  themeHref,
} from './hrefs'

describe('the addresses of the site', () => {
  it('gives each entity the page its slug answers to', () => {
    expect(subjectHref('le-smic')).toBe('/s/le-smic')
    expect(figureHref('simone-veil')).toBe('/p/simone-veil')
    expect(organisationHref('attac')).toBe('/o/attac')
    expect(themeHref('economie')).toBe('/themes/economie')
    expect(argumentHref({ slug: 'dignite-de-la-personne' })).toBe('/a/dignite-de-la-personne')
    expect(occupationFamilyHref({ slug: 'executif' })).toBe('/metiers/executif')
  })

  it('puts a position under its subject, by its own slug', () => {
    expect(positionHref('le-smic', 'augmenter')).toBe('/s/le-smic/position/augmenter')
  })

  it('puts each slide of the carousel of a subject under the subject', () => {
    expect(subjectShareSlideHref('le-smic', 'classement')).toBe('/s/le-smic/partage/classement')
  })

  it('puts an author on a subject under the author', () => {
    expect(figureOnSubjectHref('simone-veil', 'le-smic')).toBe('/p/simone-veil/s/le-smic')
    expect(organisationOnSubjectHref('attac', 'le-smic')).toBe('/o/attac/s/le-smic')
  })

  it('opens the new statement form on a subject for who is signed in', () => {
    expect(addStatementHref({ id: 'abc', title: 'L’âge & la retraite' }, true)).toBe(
      '/pdp/ajouter?subjectId=abc&subjectTitle=L%E2%80%99%C3%A2ge%20%26%20la%20retraite',
    )
  })

  it('sends a visitor who wants to add a statement to the page that explains how to contribute', () => {
    expect(addStatementHref({ id: 'abc', title: 'Le SMIC' }, false)).toBe('/contribuer')
  })

  it('opens the new statement form on an author already chosen, whatever the name holds', () => {
    expect(newStatementOfFigureHref({ id: 'abc', name: 'Élisabeth Borne & co' })).toBe(
      '/pdp/ajouter?figureId=abc&figureName=%C3%89lisabeth%20Borne%20%26%20co',
    )
    expect(newStatementOfOrganisationHref({ id: 'abc', name: 'La France insoumise' })).toBe(
      '/pdp/ajouter?organisationId=abc&organisationName=La%20France%20insoumise',
    )
  })

  it('opens the new statement form on a position of a subject', () => {
    expect(newStatementOnPositionHref({ id: 'abc', title: 'Le SMIC' }, { id: 'def' })).toBe(
      '/pdp/ajouter?subjectId=abc&subjectTitle=Le%20SMIC&positionId=def',
    )
  })

  it('opens the new statement form on the signature of a joint declaration', () => {
    expect(signJointDeclarationHref({ slug: 'le-manifeste-de-paris' })).toBe(
      '/pdp/ajouter?declaration=le-manifeste-de-paris',
    )
  })

  it('edits a statement by its id', () => {
    expect(statementEditHref('abc')).toBe('/pdp/abc/modifier')
  })
})
