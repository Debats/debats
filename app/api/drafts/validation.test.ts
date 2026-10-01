import { describe, expect, it } from 'vitest'
import { parseDraftAuthor, validateSlugifiableFields } from './validation'

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
