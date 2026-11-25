import { describe, it, expect } from 'vitest'
import { ALL_CONTRADICTORY } from '../read-models/position-judgements'
import { organisationRef, publicFigureRef } from '../read-models/statement-author'
import {
  membersCohesion,
  opposedPairs,
  siteExpression,
  SiteStatement,
  speakersByFamily,
  standings,
} from './site-analyses'

const figure = (name: string) => publicFigureRef({ id: name, name, slug: name.toLowerCase() })

const party = (name: string) =>
  organisationRef({ id: name, name, slug: name.toLowerCase(), acronym: null })

/** « Alma took position p on subject s »: the position is named after its subject */
const took = (
  author: SiteStatement['author'],
  subject: string,
  position: string,
  over: Partial<SiteStatement> = {},
): SiteStatement => ({
  author,
  subject: { id: subject, title: `Sujet ${subject}`, slug: subject },
  positionId: `${subject}:${position}`,
  type: 'declaration',
  signed: false,
  sourceName: 'Le Monde',
  ...over,
})

const alma = figure('Alma')
const boris = figure('Boris')
const chloe = figure('Chloé')
const david = figure('David')

/** One statement on each of these subjects, always for the same position */
const onEach = (author: SiteStatement['author'], subjects: string[], position: string) =>
  subjects.map((subject) => took(author, subject, position))

describe('speakersByFamily', () => {
  const families = [
    { id: 'elected', name: 'Élu·e', slug: 'elu', position: 1 },
    { id: 'research', name: 'Recherche', slug: 'recherche', position: 2 },
    { id: 'culture', name: 'Culture', slug: 'culture', position: 3 },
  ]

  it('counts for each family the voices of its figures, a voice being a figure on a subject', () => {
    const speakers = speakersByFamily(
      [took(alma, 's1', 'a'), took(alma, 's2', 'a'), took(boris, 's1', 'b')],
      new Map([
        ['Alma', new Set(['elected'])],
        ['Boris', new Set(['research'])],
      ]),
      families,
    )

    expect(speakers.map(({ family, voices, figures }) => [family.id, voices, figures])).toEqual([
      ['elected', 2, 1],
      ['research', 1, 1],
    ])
  })

  it('counts a figure once on a subject, however many statements she made there', () => {
    const [elected] = speakersByFamily(
      [took(alma, 's1', 'a'), took(alma, 's1', 'a'), took(alma, 's1', 'b')],
      new Map([['Alma', new Set(['elected'])]]),
      families,
    )

    expect(elected.voices).toBe(1)
  })

  it('counts a figure of two families in both', () => {
    const speakers = speakersByFamily(
      [took(alma, 's1', 'a')],
      new Map([['Alma', new Set(['elected', 'research'])]]),
      families,
    )

    expect(speakers.map(({ family }) => family.id)).toEqual(['elected', 'research'])
  })

  it('leaves out organisations, which hold no occupation, and families nobody spoke from', () => {
    const speakers = speakersByFamily(
      [took(party('Parti'), 's1', 'a')],
      new Map([['Parti', new Set(['elected'])]]),
      families,
    )

    expect(speakers).toEqual([])
  })
})

describe('opposedPairs', () => {
  const subjects = ['s1', 's2', 's3']
  const options = { minSubjects: 3, limit: 4 }

  it('counts the subjects two figures both spoke on without sharing a position', () => {
    const [pair] = opposedPairs(
      [...onEach(alma, subjects, 'for'), ...onEach(boris, subjects, 'against')],
      ALL_CONTRADICTORY,
      options,
    )

    expect([pair.a.name, pair.b.name]).toEqual(['Alma', 'Boris'])
    expect(pair.opposedSubjects).toBe(3)
    expect(pair.commonSubjects).toBe(3)
    expect(pair.examples.map((subject) => subject.id)).toEqual(['s1', 's2', 's3'])
  })

  it('does not oppose two figures on a subject where they share a position', () => {
    const [pair] = opposedPairs(
      [
        ...onEach(alma, subjects, 'for'),
        took(boris, 's1', 'for'),
        took(boris, 's2', 'against'),
        took(boris, 's3', 'against'),
      ],
      ALL_CONTRADICTORY,
      options,
    )

    expect(pair.opposedSubjects).toBe(2)
    expect(pair.commonSubjects).toBe(3)
  })

  it('does not oppose two figures whose positions were judged compatible', () => {
    const [pair] = opposedPairs(
      [...onEach(alma, subjects, 'for'), ...onEach(boris, subjects, 'against')],
      // On the first subject, « for » and « against » were judged compatible
      (a, b) => a === b || (a.startsWith('s1:') && b.startsWith('s1:')),
      options,
    )

    expect(pair.opposedSubjects).toBe(2)
  })

  it('pairs only figures who spoke on enough subjects', () => {
    const pairs = opposedPairs(
      [...onEach(alma, subjects, 'for'), ...onEach(boris, ['s1', 's2'], 'against')],
      ALL_CONTRADICTORY,
      options,
    )

    expect(pairs).toEqual([])
  })

  it('never pairs organisations', () => {
    const pairs = opposedPairs(
      [...onEach(alma, subjects, 'for'), ...onEach(party('Parti'), subjects, 'against')],
      ALL_CONTRADICTORY,
      options,
    )

    expect(pairs).toEqual([])
  })

  it('shows each figure once, in the pair where she is opposed on the most subjects', () => {
    const pairs = opposedPairs(
      [
        ...onEach(alma, subjects, 'for'),
        ...onEach(boris, subjects, 'against'),
        took(chloe, 's1', 'against'),
        took(chloe, 's2', 'for'),
        took(chloe, 's3', 'for'),
        ...onEach(david, subjects, 'for'),
      ],
      ALL_CONTRADICTORY,
      options,
    )

    expect(pairs.map((pair) => [pair.a.name, pair.b.name, pair.opposedSubjects])).toEqual([
      ['Alma', 'Boris', 3],
      ['Chloé', 'David', 1],
    ])
  })

  it('shows no pair that is opposed on nothing', () => {
    const pairs = opposedPairs(
      [...onEach(alma, subjects, 'for'), ...onEach(boris, subjects, 'for')],
      ALL_CONTRADICTORY,
      options,
    )

    expect(pairs).toEqual([])
  })
})

describe('standings', () => {
  const options = { minSubjects: 2, limit: 1 }
  /** On each subject, two voices for « major » and what the figures under test add */
  const crowd = (subjects: string[]) =>
    subjects.flatMap((subject) => [
      took(figure(`x-${subject}`), subject, 'major'),
      took(figure(`y-${subject}`), subject, 'major'),
    ])

  it('sets apart who most often takes the most supported position and who most often takes another', () => {
    const { withLeading, elsewhere } = standings(
      [
        ...crowd(['s1', 's2']),
        ...onEach(alma, ['s1', 's2'], 'major'),
        ...onEach(boris, ['s1', 's2'], 'minor'),
      ],
      { minSubjects: 2, limit: 1 },
    )

    expect(
      withLeading.map(({ figure: who, withLeading: n, compared }) => [who.name, n, compared]),
    ).toEqual([['Alma', 2, 2]])
    expect(
      elsewhere.map(({ figure: who, withLeading: n, compared }) => [who.name, n, compared]),
    ).toEqual([['Boris', 0, 2]])
  })

  it('counts a figure with the leading position when hers ties with it', () => {
    const { withLeading } = standings(
      [
        took(alma, 's1', 'a'),
        took(boris, 's1', 'b'),
        took(alma, 's2', 'a'),
        took(boris, 's2', 'b'),
      ],
      { minSubjects: 2, limit: 2 },
    )

    expect(withLeading.map(({ withLeading: n }) => n)).toEqual([2, 2])
  })

  it('compares a figure only on the subjects somebody else spoke on, and ranks her only with enough of them', () => {
    const { withLeading, elsewhere } = standings(
      [...crowd(['s1']), took(alma, 's1', 'major'), took(alma, 'alone', 'a')],
      options,
    )

    expect([...withLeading, ...elsewhere].map(({ figure: who }) => who.name)).not.toContain('Alma')
  })

  it('never ranks an organisation, though its voice counts in what leads', () => {
    const lone = party('Parti')
    const { withLeading, elsewhere } = standings(
      [...onEach(lone, ['s1', 's2'], 'a'), ...onEach(alma, ['s1', 's2'], 'a')],
      { minSubjects: 2, limit: 5 },
    )

    expect(withLeading.map(({ figure: who }) => who.name)).toEqual(['Alma'])
    expect(elsewhere).toEqual([])
  })

  it('ranks a figure who takes the most supported position half the time with those who most often do', () => {
    const { withLeading, elsewhere } = standings(
      [...crowd(['s1', 's2']), took(alma, 's1', 'major'), took(alma, 's2', 'minor')],
      { minSubjects: 2, limit: 10 },
    )

    expect(withLeading.map(({ figure: who }) => who.name)).toContain('Alma')
    expect(elsewhere).toEqual([])
  })
})

describe('membersCohesion', () => {
  const lfi = party('LFI')
  const members = new Map([['LFI', new Set(['Alma', 'Boris'])]])
  const options = { minVoices: 1, limit: 5 }

  it('counts how often the members of an organisation take one of its positions, or only others', () => {
    const [cohesion] = membersCohesion(
      [
        took(lfi, 's1', 'for'),
        took(lfi, 's2', 'for'),
        took(alma, 's1', 'for'),
        took(alma, 's2', 'against'),
        took(boris, 's1', 'for'),
      ],
      members,
      ALL_CONTRADICTORY,
      options,
    )

    expect(cohesion.organisation.name).toBe('LFI')
    expect([cohesion.aligned, cohesion.apart, cohesion.subjects]).toEqual([2, 1, 2])
  })

  it('ignores what members say on subjects the organisation did not speak on, and who is no member', () => {
    const [cohesion] = membersCohesion(
      [
        took(lfi, 's1', 'for'),
        took(alma, 's1', 'for'),
        took(alma, 'elsewhere', 'against'),
        took(chloe, 's1', 'against'),
      ],
      members,
      ALL_CONTRADICTORY,
      options,
    )

    expect([cohesion.aligned, cohesion.apart]).toEqual([1, 0])
  })

  it('counts a member neither with nor apart when she only took positions compatible with the line', () => {
    const [cohesion] = membersCohesion(
      [took(lfi, 's1', 'moratorium'), took(alma, 's1', 'abandon'), took(boris, 's1', 'build')],
      members,
      // « moratorium » and « abandon » were judged compatible
      (a, b) => a === b || [a, b].sort().join() === 's1:abandon,s1:moratorium',
      options,
    )

    expect([cohesion.aligned, cohesion.apart, cohesion.subjects]).toEqual([0, 1, 1])
  })

  it('leaves out an organisation whose members spoke too little on its subjects', () => {
    const cohesion = membersCohesion(
      [took(lfi, 's1', 'for'), took(alma, 's1', 'for')],
      members,
      ALL_CONTRADICTORY,
      { minVoices: 2, limit: 5 },
    )

    expect(cohesion).toEqual([])
  })

  it('lists first the organisations whose members spoke the most on its subjects', () => {
    const ps = party('PS')
    const cohesion = membersCohesion(
      [
        took(lfi, 's1', 'for'),
        took(alma, 's1', 'for'),
        took(ps, 's1', 'for'),
        took(ps, 's2', 'for'),
        took(chloe, 's1', 'for'),
        took(chloe, 's2', 'against'),
      ],
      new Map([
        ['LFI', new Set(['Alma'])],
        ['PS', new Set(['Chloé'])],
      ]),
      ALL_CONTRADICTORY,
      options,
    )

    expect(cohesion.map(({ organisation }) => organisation.name)).toEqual(['PS', 'LFI'])
  })
})

describe('siteExpression', () => {
  it('counts the statements by type, most used first, and never names a type nobody used', () => {
    const { byType } = siteExpression(
      [
        took(alma, 's1', 'a', { type: 'vote' }),
        took(boris, 's1', 'a', { type: 'vote' }),
        took(alma, 's2', 'a'),
      ],
      3,
    )

    expect(byType).toEqual([
      { type: 'vote', count: 2 },
      { type: 'declaration', count: 1 },
    ])
  })

  it('sets apart the signatures of joint declarations from what authors said or did on their own', () => {
    const expression = siteExpression(
      [took(alma, 's1', 'a'), took(boris, 's1', 'a', { signed: true })],
      3,
    )

    expect([expression.own, expression.signed]).toEqual([1, 1])
  })

  it('names the sources cited the most outside joint declarations, whatever the case they were typed in', () => {
    const { sources } = siteExpression(
      [
        took(alma, 's1', 'a', { sourceName: 'Le Monde' }),
        took(boris, 's1', 'a', { sourceName: 'le monde ' }),
        took(chloe, 's1', 'a', { sourceName: 'Libération' }),
        took(david, 's1', 'a', { sourceName: 'Mediapart' }),
        took(david, 's2', 'a', { sourceName: 'Tribune', signed: true }),
        took(alma, 's2', 'a', { sourceName: 'Tribune', signed: true }),
        took(boris, 's2', 'a', { sourceName: 'Tribune', signed: true }),
      ],
      2,
    )

    expect(sources).toEqual([
      { name: 'Le Monde', count: 2 },
      { name: 'Libération', count: 1 },
    ])
  })
})
