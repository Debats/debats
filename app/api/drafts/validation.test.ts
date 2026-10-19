import { describe, expect, it } from 'vitest'
import {
  parseDraftAffiliations,
  parseDraftArguments,
  parseDraftAuthor,
  parseDraftOccupations,
  validateSlugifiableFields,
} from './validation'
import { ORGANISATION_TYPES } from '../../../domain/entities/organisation'

describe('parseDraftAuthor', () => {
  it('accepts a public figure author without creation data', () => {
    expect(parseDraftAuthor({ kind: 'public_figure', name: 'Gabriel Attal' })).toEqual({
      author: { kind: 'public_figure', name: 'Gabriel Attal', data: null },
    })
  })

  it('accepts an organisation author with its creation data', () => {
    const data = {
      presentation: 'Parti politique fondé en 2016.',
      organisationType: 'political_party',
    }

    expect(parseDraftAuthor({ kind: 'organisation', name: 'Renaissance', data })).toEqual({
      author: { kind: 'organisation', name: 'Renaissance', data },
    })
  })

  it('rejects a missing author', () => {
    expect(parseDraftAuthor(undefined)).toEqual({
      error: 'Field author must be an object with a kind and a name',
    })
  })

  it('rejects an unknown author kind', () => {
    expect(parseDraftAuthor({ kind: 'party', name: 'Renaissance' })).toEqual({
      error: 'Field author.kind must be "public_figure" or "organisation"',
    })
  })

  it('rejects a name that produces an empty slug', () => {
    expect(parseDraftAuthor({ kind: 'public_figure', name: '???' })).toEqual({
      error: 'Field author.name must contain at least one alphanumeric character',
    })
  })

  it('rejects an organisation without a known type when creation data is given', () => {
    expect(
      parseDraftAuthor({
        kind: 'organisation',
        name: 'Renaissance',
        data: { presentation: 'Parti politique.', organisationType: 'movement' },
      }),
    ).toEqual({
      error:
        'Field author.data.organisationType must be one of: political_party, ngo, union, company, lobby, business_group, association, collective',
    })
  })
})

describe('validateSlugifiableFields', () => {
  it('accepts titles that slugify', () => {
    expect(
      validateSlugifiableFields({ subjectTitle: "L'école", positionTitle: 'Plus de moyens' }, false),
    ).toBeNull()
  })

  it('rejects a title that does not slugify', () => {
    expect(validateSlugifiableFields({ subjectTitle: '!!!', positionTitle: 'Ok' }, false)).toBe(
      'Field subjectTitle must contain at least one alphanumeric character',
    )
  })

  it('skips absent fields when partial', () => {
    expect(validateSlugifiableFields({ subjectTitle: "L'école" }, true)).toBeNull()
  })
})

describe('parseDraftArguments', () => {
  it('defaults to no argument', () => {
    expect(parseDraftArguments(undefined)).toEqual({ arguments: [] })
  })

  it('accepts a title alone', () => {
    expect(parseDraftArguments([{ title: 'Risque d’exil fiscal' }])).toEqual({
      arguments: [{ title: 'Risque d’exil fiscal' }],
    })
  })

  it('keeps the description that tells close arguments apart', () => {
    expect(
      parseDraftArguments([
        { title: 'Hausse des recettes fiscales', description: 'Ce que l’État encaisse en plus.' },
      ]),
    ).toEqual({
      arguments: [
        { title: 'Hausse des recettes fiscales', description: 'Ce que l’État encaisse en plus.' },
      ],
    })
  })

  it('trims the title and drops a repeated one, whatever its case', () => {
    expect(parseDraftArguments([{ title: '  Exil fiscal  ' }, { title: 'EXIL FISCAL' }])).toEqual({
      arguments: [{ title: 'Exil fiscal' }],
    })
  })

  it('rejects a title shorter than three characters', () => {
    expect(parseDraftArguments([{ title: 'ok' }])).toEqual({
      error: 'Field arguments[0].title must be 3 to 255 characters',
    })
  })

  it('rejects something that is not an array', () => {
    expect(parseDraftArguments('Exil fiscal')).toEqual({ error: 'Field arguments must be an array' })
  })
})

describe('parseDraftOccupations', () => {
  it('defaults to no occupation', () => {
    expect(parseDraftOccupations(undefined)).toEqual({ occupations: [] })
  })

  it('reads a bare name as a current occupation', () => {
    expect(parseDraftOccupations(['Députée'])).toEqual({
      occupations: [{ name: 'Députée', current: true }],
    })
  })

  it('accepts a former occupation', () => {
    expect(parseDraftOccupations([{ name: 'Ministre', current: false }])).toEqual({
      occupations: [{ name: 'Ministre', current: false }],
    })
  })

  it('keeps the last word on an occupation named twice', () => {
    expect(parseDraftOccupations(['Ministre', { name: 'Ministre', current: false }])).toEqual({
      occupations: [{ name: 'Ministre', current: false }],
    })
  })

  it('rejects an empty name', () => {
    expect(parseDraftOccupations([''])).toEqual({
      error: 'Field occupations[0] must name an occupation',
    })
  })
})

describe('parseDraftAffiliations', () => {
  it('defaults to no affiliation', () => {
    expect(parseDraftAffiliations(undefined)).toEqual({ affiliations: [] })
  })

  it('accepts an organisation name alone', () => {
    expect(parseDraftAffiliations([{ organisation: 'Les Écologistes' }])).toEqual({
      affiliations: [{ organisation: 'Les Écologistes' }],
    })
  })

  it('keeps the role and the period', () => {
    expect(
      parseDraftAffiliations([
        {
          organisation: 'Les Républicains',
          role: 'président du groupe',
          startedOn: '2015-05-30',
          endedOn: '2022-12-11',
        },
      ]),
    ).toEqual({
      affiliations: [
        {
          organisation: 'Les Républicains',
          role: 'président du groupe',
          startedOn: '2015-05-30',
          endedOn: '2022-12-11',
        },
      ],
    })
  })

  it('carries the data needed to create an unknown organisation', () => {
    const organisationData = {
      presentation: 'Think tank libéral consacré aux finances publiques.',
      organisationType: 'association',
    }

    expect(parseDraftAffiliations([{ organisation: 'Fondation iFRAP', organisationData }])).toEqual({
      affiliations: [{ organisation: 'Fondation iFRAP', organisationData }],
    })
  })

  it('rejects an unknown organisation type', () => {
    expect(
      parseDraftAffiliations([
        {
          organisation: 'Fondation iFRAP',
          organisationData: { presentation: 'x', organisationType: 'think_tank' },
        },
      ]),
    ).toEqual({
      error: `Field affiliations[0].organisationData.organisationType must be one of: ${ORGANISATION_TYPES.join(', ')}`,
    })
  })

  it('rejects a malformed date', () => {
    expect(parseDraftAffiliations([{ organisation: 'Les Écologistes', startedOn: '2015' }])).toEqual(
      { error: 'Field affiliations[0].startedOn must be a date (YYYY-MM-DD)' },
    )
  })

  it('rejects a missing organisation name', () => {
    expect(parseDraftAffiliations([{ role: 'adhérente' }])).toEqual({
      error: 'Field affiliations[0].organisation must contain at least one alphanumeric character',
    })
  })
})
