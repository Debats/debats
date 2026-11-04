import { describe, expect, it } from 'vitest'
import { parseStatementPatch } from './validation'

describe('parseStatementPatch', () => {
  it('reads only the fields sent, the content whole and the arguments as titles to mobilise', () => {
    expect(parseStatementPatch({ sourceUrl: ' https://example.org/a ' })).toEqual({
      patch: { sourceUrl: 'https://example.org/a' },
    })
    expect(
      parseStatementPatch({
        content: { kind: 'act', deed: 'Cosignature de la tribune « Pour » dans Le Monde' },
        sourceName: 'Le Monde',
        statedAt: '2026-02-14',
        position: 'report-a-64-ans',
        arguments: ['Justice fiscale', { title: 'Risque d’exil fiscal', description: ' ' }],
      }),
    ).toEqual({
      patch: {
        content: { kind: 'act', deed: 'Cosignature de la tribune « Pour » dans Le Monde' },
        sourceName: 'Le Monde',
        statedAt: '2026-02-14',
        position: 'report-a-64-ans',
        arguments: [
          { title: 'Justice fiscale', description: '' },
          { title: 'Risque d’exil fiscal', description: '' },
        ],
      },
    })
  })

  it('refuses an empty correction, a blank text or position, and a malformed date', () => {
    expect(parseStatementPatch({})).toEqual({ error: 'Nothing to change: send at least one field' })
    expect(parseStatementPatch({ sourceName: '  ' })).toEqual({
      error: 'Field sourceName cannot be blank',
    })
    expect(parseStatementPatch({ position: '' })).toEqual({
      error: 'Field position must be the slug of a position of the same subject',
    })
    expect(parseStatementPatch({ statedAt: '14/02/2026' })).toEqual({
      error: 'Field statedAt must be a date (YYYY-MM-DD)',
    })
  })

  it('refuses a content that does not match its kind, as the drafts API does', () => {
    expect(parseStatementPatch({ content: { kind: 'vote', votedText: 'PL' } })).toEqual({
      error:
        'Field content is invalid for kind "vote": check choice — expected votedText, choice (pour | contre | abstention)',
    })
  })

  it('refuses arguments that are not titles, and an empty list is a list', () => {
    expect(parseStatementPatch({ arguments: 'Justice fiscale' })).toEqual({
      error: 'Field arguments must be an array of titles or { title, description } objects',
    })
    expect(parseStatementPatch({ arguments: [{ description: 'x' }] })).toEqual({
      error: 'Field arguments must be an array of titles or { title, description } objects',
    })
    expect(parseStatementPatch({ arguments: [] })).toEqual({ patch: { arguments: [] } })
  })

  it('refuses what is not a JSON object and any unknown field', () => {
    expect(parseStatementPatch([])).toEqual({ error: 'Expected a JSON object.' })
    expect(parseStatementPatch({ quote: 'x' })).toEqual({ error: 'Unknown fields: quote' })
  })
})
