import { describe, expect, it } from 'vitest'
import { buildContentCatalog } from './content-catalog'

const noOccupations = { occupationFamilies: [], occupations: [] }

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
      ...noOccupations,
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
      ...noOccupations,
    })

    expect(catalog.subjects[0].positions).toEqual([])
  })

  it('drops positions whose subject is missing', () => {
    const catalog = buildContentCatalog({
      subjects: [],
      positions: [{ id: 'pos-1', subjectId: 'gone', slug: 'orpheline', title: 'Orpheline' }],
      publicFigures: [],
      organisations: [],
      ...noOccupations,
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
      ...noOccupations,
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
      ...noOccupations,
    })

    expect(catalog.organisations).toEqual([
      {
        slug: 'confederation-generale-du-travail',
        name: 'Confédération générale du travail',
        acronym: 'CGT',
      },
    ])
  })

  it('lists the closed list of occupations by family, families in their order, names by name', () => {
    const catalog = buildContentCatalog({
      subjects: [],
      positions: [],
      publicFigures: [],
      organisations: [],
      occupationFamilies: [
        { id: 'f-2', slug: 'chercheur-se', name: 'Chercheur·se et universitaire', position: 2 },
        { id: 'f-1', slug: 'elu-e', name: 'Élu·e', position: 1 },
        { id: 'f-3', slug: 'artiste', name: 'Artiste', position: 3 },
      ],
      occupations: [
        { id: 'o-1', familyId: 'f-1', slug: 'senateur-rice', name: 'Sénateur·rice' },
        { id: 'o-2', familyId: 'f-1', slug: 'depute-e', name: 'Député·e' },
        { id: 'o-3', familyId: 'f-2', slug: 'economiste', name: 'Économiste' },
      ],
    })

    expect(catalog.occupations).toEqual([
      {
        slug: 'elu-e',
        name: 'Élu·e',
        occupations: [
          { slug: 'depute-e', name: 'Député·e' },
          { slug: 'senateur-rice', name: 'Sénateur·rice' },
        ],
      },
      {
        slug: 'chercheur-se',
        name: 'Chercheur·se et universitaire',
        occupations: [{ slug: 'economiste', name: 'Économiste' }],
      },
      { slug: 'artiste', name: 'Artiste', occupations: [] },
    ])
  })
})
