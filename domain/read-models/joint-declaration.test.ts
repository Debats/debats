import { describe, it, expect } from 'vitest'
import {
  declarationsByYear,
  engagedSubjectsCount,
  JointDeclarationSummary,
  signatoriesLabel,
  signaturePreviewOf,
  signaturesCount,
} from './joint-declaration'
import { sampleJointDeclaration } from '../use-cases/joint-declaration-test-helpers'

const figure = { kind: 'public_figure' as const }
const organisation = { kind: 'organisation' as const }

const summary = (
  title: string,
  day: string,
  held: { subjects?: string[]; signatories?: number } = {},
): JointDeclarationSummary => ({
  id: title,
  title,
  slug: title.toLowerCase(),
  declaredAt: new Date(day),
  subjects: (held.subjects ?? []).map((slug) => ({ title: slug, slug })),
  signatories: Array.from({ length: held.signatories ?? 0 }, (_, index) => ({
    kind: 'public_figure' as const,
    id: `${title}-${index}`,
    name: `Signataire ${index}`,
    slug: `signataire-${index}`,
    acronym: null,
  })),
})

describe('signatoriesLabel', () => {
  it('counts personalities as signatories when nobody else signed', () => {
    expect(signatoriesLabel([figure])).toBe('1 signataire')
    expect(signatoriesLabel([figure, figure])).toBe('2 signataires')
  })

  it('says so when only organisations signed', () => {
    expect(signatoriesLabel([organisation])).toBe('1 organisation')
    expect(signatoriesLabel([organisation, organisation])).toBe('2 organisations')
  })

  it('names both when personalities and organisations signed together', () => {
    expect(signatoriesLabel([figure, organisation, figure])).toBe('2 personnalités, 1 organisation')
  })

  it('says a text nobody was found to sign yet has no signature', () => {
    expect(signatoriesLabel([])).toBe('Aucune signature enregistrée')
  })
})

describe('declarationsByYear', () => {
  it('lists the texts by year, the most recent first', () => {
    const years = declarationsByYear([
      summary('Hiatus', '2025-02-07'),
      summary('Loyers', '2026-10-03'),
      summary('Manifeste', '2026-11-21'),
    ])
    expect(years.map((y) => [y.year, y.declarations.map((d) => d.title)])).toEqual([
      [2026, ['Manifeste', 'Loyers']],
      [2025, ['Hiatus']],
    ])
  })

  it('settles two texts of the same day by their title', () => {
    const years = declarationsByYear([
      summary('Tribune B', '2026-11-21'),
      summary('Tribune A', '2026-11-21'),
    ])
    expect(years[0].declarations.map((d) => d.title)).toEqual(['Tribune A', 'Tribune B'])
  })

  it('reads the year of a first of January in UTC, as every day of the site', () => {
    expect(declarationsByYear([summary('Voeux', '2026-01-01')])[0].year).toBe(2026)
  })

  it('lists nothing from nothing', () => {
    expect(declarationsByYear([])).toEqual([])
  })
})

describe('signaturePreviewOf', () => {
  it('says what a signature will make: each position of the text, on the day and the source of the text', () => {
    const preview = signaturePreviewOf({
      declaration: {
        ...sampleJointDeclaration(),
        declaredAt: new Date('2026-11-21'),
        sourceName: 'Manifeste de Paris',
      },
      stances: [
        {
          subject: { id: 's1', title: 'La concentration des médias', slug: 'medias', problem: '?' },
          position: { id: 'p1', title: 'Renforcer l’indépendance', slug: 'renforcer' },
          quote: 'un renforcement de l’indépendance des médias',
        },
      ],
      signatories: [],
    })
    expect(preview).toEqual({
      sourceName: 'Manifeste de Paris',
      declaredAt: '2026-11-21',
      stances: [
        {
          subjectTitle: 'La concentration des médias',
          subjectHref: '/s/medias',
          positionTitle: 'Renforcer l’indépendance',
        },
      ],
    })
  })
})

describe('the counters of the index', () => {
  const index = [
    summary('Manifeste', '2026-11-21', { subjects: ['medias', 'ia'], signatories: 9 }),
    summary('Hiatus', '2025-02-07', { subjects: ['ia'], signatories: 15 }),
  ]

  it('add up the signatures of every text', () => {
    expect(signaturesCount(index)).toBe(24)
  })

  it('count a subject two texts engage once', () => {
    expect(engagedSubjectsCount(index)).toBe(2)
  })
})
