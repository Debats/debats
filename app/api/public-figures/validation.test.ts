import { describe, expect, it } from 'vitest'
import { parseAffiliationInput } from './validation'

describe('parseAffiliationInput', () => {
  it('reads the organisation and the optional role and period, blanks as empty strings', () => {
    expect(parseAffiliationInput({ organisation: 'la-cgt' })).toEqual({
      affiliation: { organisation: 'la-cgt', role: '', startedOn: '', endedOn: '' },
    })
    expect(
      parseAffiliationInput({
        organisation: ' la-cgt ',
        role: 'secrétaire générale',
        startedOn: '2023-03-31',
        endedOn: null,
      }),
    ).toEqual({
      affiliation: {
        organisation: 'la-cgt',
        role: 'secrétaire générale',
        startedOn: '2023-03-31',
        endedOn: '',
      },
    })
  })

  it('requires an organisation', () => {
    expect(parseAffiliationInput({})).toEqual({
      error: 'Field organisation is required: the slug of an organisation of the catalogue',
    })
    expect(parseAffiliationInput({ organisation: '  ' })).toEqual({
      error: 'Field organisation is required: the slug of an organisation of the catalogue',
    })
  })

  it('refuses what is not a JSON object, an unknown field, a non-string role or a malformed date', () => {
    expect(parseAffiliationInput('la-cgt')).toEqual({ error: 'Expected a JSON object.' })
    expect(parseAffiliationInput({ organisation: 'la-cgt', since: '2023' })).toEqual({
      error: 'Unknown fields: since',
    })
    expect(parseAffiliationInput({ organisation: 'la-cgt', role: 3 })).toEqual({
      error: 'Field role must be a string',
    })
    expect(parseAffiliationInput({ organisation: 'la-cgt', startedOn: '31/03/2023' })).toEqual({
      error: 'Field startedOn must be a date (YYYY-MM-DD)',
    })
  })
})
