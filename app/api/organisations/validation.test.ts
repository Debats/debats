import { describe, expect, it } from 'vitest'
import { parseOrganisationInput, parseOrganisationPatch } from './validation'

describe('parseOrganisationPatch', () => {
  it('keeps only the fields sent, so the rest stays as it is', () => {
    expect(parseOrganisationPatch({ acronym: ' CGT ', notorietySources: ['https://a'] })).toEqual({
      fields: { acronym: 'CGT', notorietySources: ['https://a'] },
    })
    expect(parseOrganisationPatch({})).toEqual({ fields: {} })
  })

  it('reads a null as a blank, which clears the field', () => {
    expect(parseOrganisationPatch({ websiteUrl: null })).toEqual({ fields: { websiteUrl: '' } })
  })
})

describe('parseOrganisationInput', () => {
  it('reads the fields of the organisation form, blanks as empty strings', () => {
    expect(
      parseOrganisationInput({
        name: ' Confédération générale du travail ',
        acronym: 'CGT',
        organisationType: 'union',
        presentation: 'Première confédération syndicale française.',
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/Conf%C3%A9d%C3%A9ration_g%C3%A9n%C3%A9rale_du_travail',
        notorietySources: ['https://www.cgt.fr/'],
      }),
    ).toEqual({
      fields: {
        name: 'Confédération générale du travail',
        acronym: 'CGT',
        organisationType: 'union',
        presentation: 'Première confédération syndicale française.',
        wikipediaUrl:
          'https://fr.wikipedia.org/wiki/Conf%C3%A9d%C3%A9ration_g%C3%A9n%C3%A9rale_du_travail',
        websiteUrl: '',
        notorietySources: ['https://www.cgt.fr/'],
      },
    })
  })

  it('reads an absent list of sources as empty and drops blank entries', () => {
    const parsed = parseOrganisationInput({ name: 'X', organisationType: 'ngo', presentation: 'p' })
    expect('fields' in parsed && parsed.fields.notorietySources).toEqual([])
    const trimmed = parseOrganisationInput({ name: 'X', notorietySources: [' a ', '', 'b'] })
    expect('fields' in trimmed && trimmed.fields.notorietySources).toEqual(['a', 'b'])
  })

  it('refuses what is not a JSON object, an unknown field, a non-string field or a non-list of sources', () => {
    expect(parseOrganisationInput([])).toEqual({ error: 'Expected a JSON object.' })
    expect(parseOrganisationInput({ name: 'X', logo: 'x.png' })).toEqual({
      error: 'Unknown fields: logo',
    })
    expect(parseOrganisationInput({ name: 3 })).toEqual({ error: 'Field name must be a string' })
    expect(parseOrganisationInput({ name: 'X', notorietySources: 'https://a' })).toEqual({
      error: 'Field notorietySources must be an array of strings',
    })
  })
})
