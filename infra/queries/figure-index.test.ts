import { describe, it, expect } from 'vitest'
import { Option } from 'effect'
import { toFigureIndexEntry } from './figure-index'

const row = {
  id: 'figure-1',
  name: 'Emmanuel Macron',
  slug: 'emmanuel-macron',
  presentation: 'Président de la République.',
  statements_count: 29,
  subjects_count: 25,
  latest_statement_at: '2026-04-01',
  occupations: [
    {
      name: 'Président·e de la République',
      is_current: true,
      family_id: 'family-1',
      family_name: 'Exécutif',
      family_slug: 'executif',
      family_position: 1,
    },
  ],
  affiliations: [
    { name: 'Renaissance', acronym: 'RE', slug: 'renaissance', ended_on: null },
    { name: 'Parti socialiste', acronym: null, slug: 'parti-socialiste', ended_on: '2009-12-31' },
  ],
}

describe('toFigureIndexEntry', () => {
  it('reads a row of the view as an entry of the index', () => {
    expect(toFigureIndexEntry(row)).toEqual({
      id: 'figure-1',
      name: 'Emmanuel Macron',
      slug: 'emmanuel-macron',
      presentation: 'Président de la République.',
      statementsCount: 29,
      subjectsCount: 25,
      latestStatementAt: new Date('2026-04-01'),
      occupations: [
        {
          name: 'Président·e de la République',
          isCurrent: true,
          family: { id: 'family-1', name: 'Exécutif', slug: 'executif', position: 1 },
        },
      ],
      affiliations: [
        {
          organisation: { name: 'Renaissance', acronym: 'RE', slug: 'renaissance' },
          endedOn: Option.none(),
        },
        {
          organisation: { name: 'Parti socialiste', acronym: null, slug: 'parti-socialiste' },
          endedOn: Option.some(new Date('2009-12-31')),
        },
      ],
    })
  })

  it('reads a figure who never said anything', () => {
    const silent = { ...row, statements_count: 0, subjects_count: 0, latest_statement_at: null }

    expect(toFigureIndexEntry(silent)).toMatchObject({
      statementsCount: 0,
      subjectsCount: 0,
      latestStatementAt: null,
    })
  })
})
