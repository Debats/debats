import { describe, it, expect } from 'vitest'
import {
  declarationsByYear,
  engagedSubjectsCount,
  JointDeclarationSummary,
  mostDocumentedFirst,
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

describe('mostDocumentedFirst', () => {
  const signatory = (name: string, kind: 'public_figure' | 'organisation' = 'public_figure') => ({
    kind,
    id: name,
    name,
    slug: name.toLowerCase(),
    acronym: null,
  })
  const names = (documented: Record<string, number>, ...signed: string[]) =>
    mostDocumentedFirst(
      signed.map((name) => signatory(name)),
      new Map(Object.entries(documented)),
    ).map((author) => author.name)

  it('puts first who the site documents on the most subjects', () => {
    expect(names({ Alma: 2, Bruno: 9, Chloé: 5 }, 'Alma', 'Bruno', 'Chloé')).toEqual([
      'Bruno',
      'Chloé',
      'Alma',
    ])
  })

  it('reads two signatories documented alike in the order of their names, as French sorts them', () => {
    expect(names({ Zoé: 3, Émile: 3, Alma: 3 }, 'Zoé', 'Émile', 'Alma')).toEqual([
      'Alma',
      'Émile',
      'Zoé',
    ])
  })

  it('puts last a signatory the count does not name', () => {
    expect(names({ Bruno: 1 }, 'Alma', 'Bruno')).toEqual(['Bruno', 'Alma'])
  })

  it('ranks personalities and organisations together', () => {
    const ordered = mostDocumentedFirst(
      [signatory('Alma'), signatory('Attac', 'organisation')],
      new Map([
        ['Alma', 1],
        ['Attac', 4],
      ]),
    )
    expect(ordered.map((author) => author.kind)).toEqual(['organisation', 'public_figure'])
  })
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
