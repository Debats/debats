import { describe, it, expect } from 'vitest'
import { SiteStatement } from '../services/site-analyses'
import { ANALYSES_SHOWN, AnalysesMaterial, analysesOf } from './analyses-page'
import { ArgumentSummary } from './argument'
import { MIN_SUBJECTS_TO_PAIR } from './figure-agreements'
import { publicFigureRef } from './statement-author'

const figure = (name: string) => publicFigureRef({ id: name, name, slug: name.toLowerCase() })

const took = (
  author: SiteStatement['author'],
  subject: string,
  position: string,
): SiteStatement => ({
  author,
  subject: { id: subject, title: `Sujet ${subject}`, slug: subject },
  positionId: `${subject}:${position}`,
  type: 'declaration',
  signed: false,
  sourceName: 'Le Monde',
})

const argument = (title: string, statementsCount: number): ArgumentSummary => ({
  id: title,
  title,
  slug: title,
  description: '',
  statementsCount,
  subjectsCount: statementsCount > 0 ? 1 : 0,
})

const material = (over: Partial<AnalysesMaterial> = {}): AnalysesMaterial => ({
  figures: {
    subjects: 0,
    positions: 0,
    statements: 0,
    publicFigures: 0,
    organisations: 0,
    sources: 0,
  },
  debates: [],
  moving: [],
  agreements: [],
  movedStatements: [],
  judged: [],
  statements: [],
  members: new Map(),
  familiesOf: new Map(),
  families: [],
  arguments: [],
  ...over,
})

/** Enough subjects for two figures to be paired, each on her own position */
const subjects = Array.from({ length: MIN_SUBJECTS_TO_PAIR }, (_, index) => `s${index}`)
const alma = figure('Alma')
const boris = figure('Boris')
const apart = [
  ...subjects.map((subject) => took(alma, subject, 'a')),
  ...subjects.map((subject) => took(boris, subject, 'b')),
]

describe('analysesOf', () => {
  it('shows nothing of a site without statements', () => {
    const analyses = analysesOf(material())

    expect(analyses.speakers).toEqual([])
    expect(analyses.opposed).toEqual([])
    expect(analyses.standings).toEqual({ withLeading: [], elsewhere: [] })
    expect(analyses.cohesion).toEqual([])
    expect(analyses.arguments).toEqual({ top: [], total: 0 })
  })

  it('ranks the arguments that were mobilised, and counts all of them', () => {
    const analyses = analysesOf(
      material({ arguments: [argument('Coût', 4), argument('Climat', 2), argument('Inusité', 0)] }),
    )

    expect(analyses.arguments.top.map(({ title }) => title)).toEqual(['Coût', 'Climat'])
    expect(analyses.arguments.total).toBe(3)
  })

  it('shows no more arguments than the block holds', () => {
    const many = Array.from({ length: ANALYSES_SHOWN.arguments + 2 }, (_, index) =>
      argument(`Argument ${index}`, 20 - index),
    )

    expect(analysesOf(material({ arguments: many })).arguments.top).toHaveLength(
      ANALYSES_SHOWN.arguments,
    )
  })

  it('opposes two figures who never share a position', () => {
    const [pair] = analysesOf(material({ statements: apart })).opposed

    expect([pair.a.name, pair.b.name, pair.opposedSubjects]).toEqual([
      'Alma',
      'Boris',
      MIN_SUBJECTS_TO_PAIR,
    ])
  })

  it('reads what was judged: positions judged compatible oppose nobody', () => {
    const judged = subjects.map((subject) => ({
      positionIds: [`${subject}:a`, `${subject}:b`] as const,
      compatible: true,
    }))

    expect(analysesOf(material({ statements: apart, judged })).opposed).toEqual([])
  })
})
