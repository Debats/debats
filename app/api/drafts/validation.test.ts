import { describe, expect, it } from 'vitest'
import {
  parseDraftAffiliations,
  parseDraftArguments,
  parseDraftAuthor,
  parseDraftContent,
  parseDraftOccupations,
  parseDraftPatch,
  parseDraftReview,
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
      validateSlugifiableFields(
        { subjectTitle: "L'école", positionTitle: 'Plus de moyens' },
        false,
      ),
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
    expect(parseDraftArguments('Exil fiscal')).toEqual({
      error: 'Field arguments must be an array',
    })
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

    expect(parseDraftAffiliations([{ organisation: 'Fondation iFRAP', organisationData }])).toEqual(
      {
        affiliations: [{ organisation: 'Fondation iFRAP', organisationData }],
      },
    )
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
    expect(
      parseDraftAffiliations([{ organisation: 'Les Écologistes', startedOn: '2015' }]),
    ).toEqual({ error: 'Field affiliations[0].startedOn must be a date (YYYY-MM-DD)' })
  })

  it('rejects a missing organisation name', () => {
    expect(parseDraftAffiliations([{ role: 'adhérente' }])).toEqual({
      error: 'Field affiliations[0].organisation must contain at least one alphanumeric character',
    })
  })
})

describe('parseDraftContent', () => {
  const QUOTE = 'Une citation suffisamment longue pour être valide.'

  it('reads a declaration', () => {
    expect(parseDraftContent({ kind: 'declaration', quote: QUOTE })).toEqual({
      content: { kind: 'declaration', quote: QUOTE },
    })
  })

  it('reads a programme with the document it is quoted from', () => {
    expect(
      parseDraftContent({ kind: 'program', document: "L'Avenir en commun", quote: QUOTE }),
    ).toEqual({ content: { kind: 'program', document: "L'Avenir en commun", quote: QUOTE } })
  })

  it('reads a vote as the text put to the ballot and the way it went', () => {
    expect(
      parseDraftContent({ kind: 'vote', votedText: 'Proposition de loi', choice: 'contre' }),
    ).toEqual({ content: { kind: 'vote', votedText: 'Proposition de loi', choice: 'contre' } })
  })

  it('reads an act as what was done', () => {
    expect(parseDraftContent({ kind: 'act', deed: 'Cosignature de la PPL n° 575' })).toEqual({
      content: { kind: 'act', deed: 'Cosignature de la PPL n° 575' },
    })
  })

  it('leaves aside what the kind does not call for', () => {
    expect(
      parseDraftContent({ kind: 'act', deed: 'Cosignature', quote: QUOTE, choice: 'pour' }),
    ).toEqual({ content: { kind: 'act', deed: 'Cosignature' } })
  })

  it('refuses a kind that is not one of the four', () => {
    expect(parseDraftContent({ kind: 'tweet', quote: QUOTE })).toEqual({
      error: 'Field content.kind must be one of: declaration, vote, program, act',
    })
  })

  it('refuses content that is not an object', () => {
    expect(parseDraftContent('une citation')).toEqual({ error: 'Field content must be an object' })
    expect(parseDraftContent(undefined)).toEqual({ error: 'Field content must be an object' })
  })

  it('names the field a vote lacks, and what the kind expects', () => {
    const result = parseDraftContent({ kind: 'vote', choice: 'contre' })

    expect(result).toEqual({
      error:
        'Field content is invalid for kind "vote": check votedText — expected votedText, choice (pour | contre | abstention)',
    })
  })

  it('names the quote a declaration is too short on', () => {
    expect(parseDraftContent({ kind: 'declaration', quote: 'court' })).toEqual({
      error:
        'Field content is invalid for kind "declaration": check quote — expected quote (10 characters minimum)',
    })
  })
})

describe('parseDraftPatch', () => {
  it('accepts a correction of the content, in the shape the domain gives it', () => {
    expect(
      parseDraftPatch({
        content: { kind: 'vote', votedText: 'Projet de loi Yadan', choice: 'pour' },
      }),
    ).toEqual({
      fields: { content: { kind: 'vote', votedText: 'Projet de loi Yadan', choice: 'pour' } },
    })
  })

  it('says what is wrong with a content that does not fit its kind', () => {
    expect(parseDraftPatch({ content: { kind: 'vote', choice: 'pour' } })).toEqual({
      error: expect.stringContaining('Field content is invalid for kind "vote": check votedText'),
    })
  })

  it('refuses the flat fields of the old payload by name', () => {
    expect(parseDraftPatch({ quote: 'Une citation corrigée.', statementType: 'vote' })).toEqual({
      error: 'Unknown fields: quote, statementType',
    })
  })

  it('refuses an empty correction', () => {
    expect(parseDraftPatch({})).toEqual({ error: 'No fields to update.' })
  })

  it('refuses a body that is not an object', () => {
    expect(parseDraftPatch([])).toEqual({ error: 'Expected a JSON object.' })
  })

  it('parses the author like the creation does', () => {
    expect(parseDraftPatch({ author: { kind: 'organisation', name: 'CGT' } })).toEqual({
      fields: { author: { kind: 'organisation', name: 'CGT', data: null } },
    })
  })

  it('refuses a title that would not make a slug', () => {
    expect(parseDraftPatch({ subjectTitle: '!!!' })).toEqual({
      error: 'Field subjectTitle must contain at least one alphanumeric character',
    })
  })

  it('refuses a text field that is empty or not a text', () => {
    expect(parseDraftPatch({ sourceUrl: '' })).toEqual({
      error: 'Field sourceUrl must be a non-empty string',
    })
    expect(parseDraftPatch({ sourceName: 42 })).toEqual({
      error: 'Field sourceName must be a non-empty string',
    })
  })

  it('refuses a date that is not YYYY-MM-DD', () => {
    expect(parseDraftPatch({ date: '12/06/2025' })).toEqual({
      error: 'Invalid date format (expected YYYY-MM-DD)',
    })
    expect(parseDraftPatch({ date: '2025-06-12' })).toEqual({ fields: { date: '2025-06-12' } })
  })

  it('lets the notes be cleared, as they are optional', () => {
    expect(parseDraftPatch({ aiNotes: null })).toEqual({ fields: { aiNotes: null } })
  })
})

describe('parseDraftReview', () => {
  it('accepts a revision request with the note that explains it', () => {
    expect(
      parseDraftReview({
        status: 'revision_requested',
        note: 'La citation est absente de la source.',
      }),
    ).toEqual({ status: 'revision_requested', note: 'La citation est absente de la source.' })
  })

  it('refuses a review without a note: the contributor must know what to fix', () => {
    expect(parseDraftReview({ status: 'revision_requested', note: '  ' })).toEqual({
      error: 'Field note is required: say what the contributor must fix',
    })
  })

  it('refuses every other status: validating and rejecting stay human decisions', () => {
    expect(parseDraftReview({ status: 'validated', note: 'ok' })).toEqual({
      error: 'Field status must be "revision_requested"',
    })
    expect(parseDraftReview({ status: 'rejected', note: 'non' })).toEqual({
      error: 'Field status must be "revision_requested"',
    })
  })
})
