import { describe, expect, it } from 'vitest'
import { buildContentCatalog } from './content-catalog'

describe('buildContentCatalog', () => {
  it('nests positions under the subject they belong to', () => {
    const catalog = buildContentCatalog({
      subjects: [{ id: 'sub-1', slug: 'le-nucleaire', title: 'Le nucléaire' }],
      positions: [
        {
          id: 'pos-2',
          subjectId: 'sub-1',
          slug: 'sortir-du-nucleaire',
          title: 'Sortir du nucléaire',
        },
        {
          id: 'pos-1',
          subjectId: 'sub-1',
          slug: 'relancer-le-nucleaire',
          title: 'Relancer le nucléaire',
        },
      ],
      publicFigures: [],
      organisations: [],
    })

    expect(catalog.subjects).toEqual([
      {
        slug: 'le-nucleaire',
        title: 'Le nucléaire',
        positions: [
          { slug: 'relancer-le-nucleaire', title: 'Relancer le nucléaire' },
          { slug: 'sortir-du-nucleaire', title: 'Sortir du nucléaire' },
        ],
      },
    ])
  })

  it('keeps a subject without any position', () => {
    const catalog = buildContentCatalog({
      subjects: [{ id: 'sub-1', slug: 'la-laicite', title: 'La laïcité' }],
      positions: [],
      publicFigures: [],
      organisations: [],
    })

    expect(catalog.subjects[0].positions).toEqual([])
  })

  it('drops positions whose subject is missing', () => {
    const catalog = buildContentCatalog({
      subjects: [],
      positions: [{ id: 'pos-1', subjectId: 'gone', slug: 'orpheline', title: 'Orpheline' }],
      publicFigures: [],
      organisations: [],
    })

    expect(catalog.subjects).toEqual([])
  })

  it('sorts entities by name using French collation', () => {
    const catalog = buildContentCatalog({
      subjects: [
        { id: 'sub-2', slug: 'les-retraites', title: 'Les retraites' },
        { id: 'sub-1', slug: 'l-ecole', title: "L'école" },
      ],
      positions: [],
      publicFigures: [
        { id: 'pf-1', slug: 'zoe-durand', name: 'Zoé Durand' },
        { id: 'pf-2', slug: 'elise-martin', name: 'Élise Martin' },
      ],
      organisations: [
        { id: 'org-1', slug: 'renaissance', name: 'Renaissance', acronym: null },
        {
          id: 'org-2',
          slug: 'confederation-generale-du-travail',
          name: 'Confédération générale du travail',
          acronym: 'CGT',
        },
      ],
    })

    expect(catalog.subjects.map((s) => s.title)).toEqual(["L'école", 'Les retraites'])
    expect(catalog.publicFigures.map((f) => f.name)).toEqual(['Élise Martin', 'Zoé Durand'])
    expect(catalog.organisations.map((o) => o.name)).toEqual([
      'Confédération générale du travail',
      'Renaissance',
    ])
  })

  it('exposes the acronym of an organisation when it has one', () => {
    const catalog = buildContentCatalog({
      subjects: [],
      positions: [],
      publicFigures: [],
      organisations: [
        {
          id: 'org-2',
          slug: 'confederation-generale-du-travail',
          name: 'Confédération générale du travail',
          acronym: 'CGT',
        },
      ],
    })

    expect(catalog.organisations).toEqual([
      {
        slug: 'confederation-generale-du-travail',
        name: 'Confédération générale du travail',
        acronym: 'CGT',
      },
    ])
  })
})
