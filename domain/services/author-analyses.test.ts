import { describe, expect, it } from 'vitest'
import { createPosition, createStatement, createSubject } from '../entities/entity-test-helpers'
import {
  actContent,
  declarationContent,
  organisationAuthor,
  programContent,
  publicFigureAuthor,
  StatementContent,
  StatementType,
  voteContent,
} from '../entities/statement'
import {
  organisationRef,
  publicFigureRef,
  StatementAuthorRef,
} from '../read-models/statement-author'
import { StatementWithAuthor, StatementWithDetails } from '../repositories/statement-repository'
import {
  company,
  expressionProfile,
  memberCohesion,
  organisationsLine,
  positionChanges,
  standing,
} from './author-analyses'
import { ALL_CONTRADICTORY, compatibilityOf } from '../read-models/position-judgements'

const subjectOf = (title: string) =>
  createSubject({ title, presentation: 'Présentation longue.', problem: 'Problème ?' })
const positionOn = (subjectId: string, title: string) =>
  createPosition({ title, description: 'Description longue.', subjectId })

const retraites = subjectOf('Les retraites')
const nucleaire = subjectOf('Le nucléaire')
const smic = subjectOf('Le SMIC')
const report = positionOn(retraites.id, 'Reporter l’âge')
const maintien = positionOn(retraites.id, 'Garder 62 ans')
const relance = positionOn(nucleaire.id, 'Relancer')
const sortie = positionOn(nucleaire.id, 'Sortir')
const hausse = positionOn(smic.id, 'Augmenter')
const subjects = new Map<string, ReturnType<typeof subjectOf>>([
  [retraites.id, retraites],
  [nucleaire.id, nucleaire],
  [smic.id, smic],
])

const veil = publicFigureRef({ id: 'veil', name: 'Simone Veil', slug: 'simone-veil' })
const camus = publicFigureRef({ id: 'camus', name: 'Albert Camus', slug: 'albert-camus' })
const weil = publicFigureRef({ id: 'weil', name: 'Simone Weil', slug: 'simone-weil' })
const attac = organisationRef({ id: 'attac', name: 'Attac', slug: 'attac', acronym: null })

interface Taken {
  type?: StatementType
  source?: string
  on?: string
}

/** What a statement of that type carries, so the fixture says a type in one word */
function carrying(type: StatementType): StatementContent {
  switch (type) {
    case 'declaration':
      return declarationContent('Une citation suffisamment longue.')
    case 'program':
      return programContent('Programme 2027', 'Une citation suffisamment longue.')
    case 'vote':
      return voteContent('Proposition de loi sur la fin de vie', 'pour')
    case 'act':
      return actContent('Cosignature de la proposition de loi')
  }
}

function taken(
  author: StatementAuthorRef,
  position: ReturnType<typeof positionOn>,
  { type = 'declaration', source = 'Le Monde', on = '2024-01-01' }: Taken = {},
): StatementWithAuthor {
  const statement = createStatement({
    author:
      author.kind === 'organisation'
        ? organisationAuthor(author.id)
        : publicFigureAuthor(author.id),
    positionId: position.id,
    content: carrying(type),
    sourceName: source,
    sourceUrl: 'https://example.org/source',
    statedAt: new Date(on),
    createdBy: 'user',
  })
  return { statement, position, author, arguments: [] }
}

const detailed = (entries: StatementWithAuthor[]): StatementWithDetails[] =>
  entries.map(({ statement, position, arguments: used }) => ({
    statement,
    position,
    subject: subjects.get(position.subjectId)!,
    arguments: used,
  }))

const self = publicFigureAuthor(veil.id)

describe('company', () => {
  const mine = [taken(veil, report), taken(veil, relance), taken(veil, hausse)]
  const own = detailed(mine)
  const onSubjects = [
    ...mine,
    taken(camus, report),
    taken(camus, sortie),
    taken(camus, hausse),
    taken(weil, maintien),
    taken(weil, sortie),
    taken(attac, maintien),
  ]

  it('ranks who shares the most subjects with the author, and who stands apart the most', () => {
    const result = company(own, onSubjects, self, ALL_CONTRADICTORY)

    expect(result.closest.map((c) => [c.author.name, c.agreed, c.disagreed])).toEqual([
      ['Albert Camus', 2, 1],
    ])
    // Apart on one subject each: the one who never stands with her comes first
    expect(result.opposed.map((c) => [c.author.name, c.agreed, c.disagreed])).toEqual([
      ['Simone Weil', 0, 2],
      ['Attac', 0, 1],
      ['Albert Camus', 2, 1],
    ])
  })

  it('counts a subject once, whatever the number of statements, and never the author herself', () => {
    const result = company(
      own,
      [...onSubjects, taken(camus, report, { on: '2025-01-01' }), taken(veil, report)],
      self,
      ALL_CONTRADICTORY,
    )

    expect(result.closest).toHaveLength(1)
    expect(result.closest[0]).toMatchObject({ agreed: 2, disagreed: 1 })
  })

  it('keeps the given number of each', () => {
    const result = company(own, onSubjects, self, ALL_CONTRADICTORY, 1)

    expect(result.opposed.map((c) => c.author.name)).toEqual(['Simone Weil'])
  })

  it('stays empty when nobody else spoke', () => {
    expect(company(own, mine, self, ALL_CONTRADICTORY)).toEqual({ closest: [], opposed: [] })
  })

  it('counts neither with her nor apart who only took positions compatible with hers', () => {
    // Weil took « Garder 62 ans » and « Sortir »: the first now goes with « Reporter l’âge »
    const together = compatibilityOf([{ positionIds: [report.id, maintien.id], compatible: true }])

    const result = company(own, onSubjects, self, together)

    expect(result.opposed.map((c) => [c.author.name, c.agreed, c.disagreed])).toEqual([
      ['Simone Weil', 0, 1],
      ['Albert Camus', 2, 1],
    ])
    expect(result.closest.map((c) => c.author.name)).toEqual(['Albert Camus'])
  })
})

describe('standing', () => {
  it('tells on each subject whether the author stands with the most supported position', () => {
    const mine = [taken(veil, report), taken(veil, relance), taken(veil, hausse)]
    const own = detailed(mine)
    const onSubjects = [
      ...mine,
      taken(camus, maintien),
      taken(weil, maintien),
      taken(attac, maintien),
      taken(camus, relance),
      taken(weil, sortie),
    ]

    const result = standing(own, onSubjects, self)

    expect(result.subjects.map((s) => [s.subject.title, s.authors, s.withLeading])).toEqual([
      ['Les retraites', 4, false],
      ['Le nucléaire', 3, true],
      ['Le SMIC', 1, true],
    ])
    expect(result.subjects[0].leading).toEqual({ title: 'Garder 62 ans', authors: 3 })
    expect(result.subjects[0].positions.map((p) => p.title)).toEqual(['Reporter l’âge'])
    // A subject where she speaks alone compares her with nobody
    expect(result.comparedCount).toBe(2)
    expect(result.withLeadingCount).toBe(1)
  })

  it('counts a tie as standing with the leading position', () => {
    const mine = [taken(veil, report)]
    const result = standing(detailed(mine), [...mine, taken(camus, maintien)], self)

    expect(result.subjects[0]).toMatchObject({ withLeading: true, leading: { authors: 1 } })
  })
})

describe('positionChanges', () => {
  it('lists the subjects where the author moved from a position to another, in time order', () => {
    const own = detailed([
      taken(veil, hausse),
      taken(veil, sortie, { on: '2023-06-01' }),
      taken(veil, relance, { on: '2020-01-01' }),
      taken(veil, relance, { on: '2021-01-01' }),
      taken(veil, maintien, { on: '2022-01-01' }),
      taken(veil, report, { on: '2024-05-01' }),
    ])

    const changes = positionChanges(own, ALL_CONTRADICTORY)

    expect(changes.map((c) => c.subject.title)).toEqual(['Les retraites', 'Le nucléaire'])
    const [trail] = changes[1].trails
    expect(trail.left.map((s) => [s.position.title, s.statedAt.toISOString()])).toEqual([
      ['Relancer', '2020-01-01T00:00:00.000Z'],
    ])
    expect(trail.taken.map((s) => [s.position.title, s.statedAt.toISOString()])).toEqual([
      ['Sortir', '2023-06-01T00:00:00.000Z'],
    ])
  })

  const titles = (steps: { position: { title: string } }[]) => steps.map((s) => s.position.title)
  const trailsOf = (...args: Parameters<typeof positionChanges>) =>
    positionChanges(...args)[0].trails.map((trail) => [titles(trail.left), titles(trail.taken)])

  it('keeps a return to a former position as a step of its own, on the same trail', () => {
    const own = detailed([
      taken(veil, relance, { on: '2020-01-01' }),
      taken(veil, sortie, { on: '2021-01-01' }),
      taken(veil, relance, { on: '2022-01-01' }),
    ])

    expect(trailsOf(own, ALL_CONTRADICTORY)).toEqual([[['Relancer'], ['Sortir', 'Relancer']]])
  })

  it('never chains two moves the second of which did not leave what the first took', () => {
    const [a, b, c, d] = ['Avis A', 'Avis B', 'Avis C', 'Avis D'].map((title) =>
      positionOn(nucleaire.id, title),
    )
    const own = detailed([
      taken(veil, a, { on: '2020-01-01' }),
      taken(veil, b, { on: '2020-02-01' }),
      taken(veil, c, { on: '2020-03-01' }),
      taken(veil, d, { on: '2020-04-01' }),
    ])
    const compatible = compatibilityOf(
      [
        [a, b],
        [b, d],
        [a, c],
        [c, d],
      ].map(([one, other]) => ({ positionIds: [one.id, other.id], compatible: true })),
    )

    // She left B for C, then A for D: she still holds C and D, and never went from C to D
    expect(trailsOf(own, compatible)).toEqual([
      [['Avis B'], ['Avis C']],
      [['Avis A'], ['Avis D']],
    ])
  })

  it('names every position she left at once', () => {
    const [a, b, c] = ['Avis A', 'Avis B', 'Avis C'].map((title) => positionOn(nucleaire.id, title))
    const own = detailed([
      taken(veil, a, { on: '2020-01-01' }),
      taken(veil, b, { on: '2020-02-01' }),
      taken(veil, c, { on: '2020-03-01' }),
    ])
    const compatible = compatibilityOf([{ positionIds: [a.id, b.id], compatible: true }])

    expect(trailsOf(own, compatible)).toEqual([[['Avis A', 'Avis B'], ['Avis C']]])
  })

  it('is empty for an author who never changed', () => {
    expect(
      positionChanges(detailed([taken(veil, report), taken(veil, report)]), ALL_CONTRADICTORY),
    ).toEqual([])
  })

  it('sees no change in a position taken beside one it is compatible with', () => {
    const own = detailed([
      taken(veil, relance, { on: '2020-01-01' }),
      taken(veil, sortie, { on: '2021-01-01' }),
    ])
    const together = compatibilityOf([{ positionIds: [relance.id, sortie.id], compatible: true }])

    expect(positionChanges(own, together)).toEqual([])
    expect(positionChanges(own, ALL_CONTRADICTORY)).toHaveLength(1)
  })

  it('sees no change in two positions stated the same day', () => {
    const own = detailed([
      taken(veil, relance, { on: '2020-01-01' }),
      taken(veil, sortie, { on: '2020-01-01' }),
    ])

    expect(positionChanges(own, ALL_CONTRADICTORY)).toEqual([])
  })
})

describe('expressionProfile', () => {
  it('counts the statements by type and names the most cited sources', () => {
    const own = [
      taken(veil, report, { type: 'vote', source: 'Assemblée nationale' }),
      taken(veil, relance, { type: 'declaration', source: 'Le Monde' }),
      taken(veil, hausse, { type: 'declaration', source: 'le monde ' }),
      taken(veil, hausse, { type: 'program', source: 'Programme 2022' }),
    ]

    const profile = expressionProfile(own, 2)

    expect(profile.byType).toEqual([
      { type: 'declaration', count: 2 },
      { type: 'vote', count: 1 },
      { type: 'program', count: 1 },
    ])
    expect(profile.sources).toEqual([
      { name: 'Le Monde', count: 2 },
      { name: 'Assemblée nationale', count: 1 },
    ])
  })
})

describe('memberCohesion', () => {
  const org = organisationAuthor(attac.id)
  const members = [
    { id: 'veil', name: 'Simone Veil', slug: 'simone-veil' },
    { id: 'camus', name: 'Albert Camus', slug: 'albert-camus' },
    { id: 'weil', name: 'Simone Weil', slug: 'simone-weil' },
  ]

  it('says on each subject of the organisation which members stand with it, apart, or silent', () => {
    const mine = [taken(attac, maintien), taken(attac, sortie)]
    const own = detailed(mine)
    const onSubjects = [
      ...mine,
      taken(veil, maintien),
      taken(camus, report),
      taken(camus, sortie),
      taken(weil, relance),
      taken(publicFigureRef({ id: 'other', name: 'Autre', slug: 'autre' }), report),
    ]

    const cohesion = memberCohesion(own, onSubjects, org, members)

    expect(
      cohesion.map((c) => [
        c.subject.title,
        c.aligned.map((f) => f.name),
        c.apart.map((a) => [a.figure.name, a.positions.map((p) => p.title)]),
        c.silent,
      ]),
    ).toEqual([
      ['Les retraites', ['Simone Veil'], [['Albert Camus', ['Reporter l’âge']]], 1],
      ['Le nucléaire', ['Albert Camus'], [['Simone Weil', ['Relancer']]], 1],
    ])
    expect(cohesion[0].positions.map((p) => p.title)).toEqual(['Garder 62 ans'])
  })

  it('has nothing to say without members', () => {
    const mine = [taken(attac, maintien)]
    expect(memberCohesion(detailed(mine), mine, org, [])).toEqual([])
  })
})

describe('organisationsLine', () => {
  const organisations = [
    { id: 'attac', name: 'Attac', slug: 'attac', acronym: null, organisationType: 'ngo' as const },
    { id: 'cgt', name: 'CGT', slug: 'cgt', acronym: 'CGT', organisationType: 'union' as const },
  ]

  it('compares the author with each of her organisations on the subjects both spoke on', () => {
    const mine = [taken(veil, report), taken(veil, relance), taken(veil, hausse)]
    const own = detailed(mine)
    const cgt = organisationRef({ id: 'cgt', name: 'CGT', slug: 'cgt', acronym: 'CGT' })
    const onSubjects = [...mine, taken(attac, maintien), taken(attac, relance), taken(cgt, hausse)]

    const line = organisationsLine(own, onSubjects, self, organisations)

    expect(
      line.map((l) => [
        l.organisation.name,
        l.aligned.map((s) => s.subject.title),
        l.apart.map((s) => [s.subject.title, s.theirs.map((p) => p.title)]),
      ]),
    ).toEqual([
      ['Attac', ['Le nucléaire'], [['Les retraites', ['Garder 62 ans']]]],
      ['CGT', ['Le SMIC'], []],
    ])
  })

  it('leaves out an organisation that spoke on none of her subjects', () => {
    const mine = [taken(veil, report)]
    expect(organisationsLine(detailed(mine), mine, self, organisations)).toEqual([])
  })
})
