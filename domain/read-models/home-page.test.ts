import { describe, it, expect } from 'vitest'
import { PublicFigureActivitySummary } from '../value-objects/public-figure-activity-summary'
import {
  FIGURES_PER_ROW,
  mostSpokenFigures,
  mostSpokenOrganisations,
  ORGANISATIONS_PER_ROW,
} from './home-page'
import { OrganisationSummary } from './organisation-summary'

const figure = (
  name: string,
  over: Partial<PublicFigureActivitySummary> = {},
): PublicFigureActivitySummary => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  presentation: '',
  statementsCount: 1,
  subjectsCount: 1,
  latestStatementAt: null,
  ...over,
})

const lately = (subjects: Record<string, number>) => new Map(Object.entries(subjects))
const names = (figures: PublicFigureActivitySummary[]) => figures.map(({ name }) => name)

describe('mostSpokenFigures', () => {
  it('lists the public figures who spoke on the most subjects lately, whatever they said before', () => {
    const figures = [figure('Ancienne', { subjectsCount: 58 }), figure('Vive'), figure('Remuante')]

    expect(
      names(mostSpokenFigures(figures, lately({ Vive: 9, Remuante: 4, Ancienne: 1 }), 3)),
    ).toEqual(['Vive', 'Remuante', 'Ancienne'])
  })

  it('never shows a public figure who said nothing lately', () => {
    expect(mostSpokenFigures([figure('Ancienne', { subjectsCount: 58 })], lately({}), 3)).toEqual(
      [],
    )
  })

  it('settles those who spoke on as many subjects lately by the most documented, then by name', () => {
    const figures = [
      figure('Zoé', { subjectsCount: 3 }),
      figure('Alma', { subjectsCount: 3 }),
      figure('Boris', { subjectsCount: 12 }),
    ]

    expect(names(mostSpokenFigures(figures, lately({ Zoé: 3, Alma: 3, Boris: 3 }), 3))).toEqual([
      'Boris',
      'Alma',
      'Zoé',
    ])
  })

  it('shows no more than asked', () => {
    const figures = ['A', 'B', 'C'].map((name) => figure(name))

    expect(mostSpokenFigures(figures, lately({ A: 3, B: 2, C: 1 }), 2)).toHaveLength(2)
  })

  it('shows full rows only: the faces that would start a row are left out', () => {
    const spoke = Array.from({ length: FIGURES_PER_ROW + 3 }, (_, index) => `F${index}`)
    const figures = spoke.map((name) => figure(name))
    const each = lately(Object.fromEntries(spoke.map((name) => [name, 1])))

    expect(mostSpokenFigures(figures, each, 2 * FIGURES_PER_ROW)).toHaveLength(FIGURES_PER_ROW)
  })

  it('shows the few there are when they do not fill a row', () => {
    const figures = [figure('Alma'), figure('Boris')]

    expect(mostSpokenFigures(figures, lately({ Alma: 1, Boris: 1 }), 16)).toHaveLength(2)
  })
})

describe('mostSpokenOrganisations', () => {
  const organisation = (
    name: string,
    over: Partial<OrganisationSummary> = {},
  ): OrganisationSummary => ({
    id: name,
    name,
    slug: name.toLowerCase(),
    acronym: null,
    organisationType: 'political_party',
    presentation: '',
    membersCount: 0,
    statementsCount: 1,
    subjectsCount: 1,
    ...over,
  })
  const named = (organisations: OrganisationSummary[]) => organisations.map(({ name }) => name)

  it('lists the organisations that spoke on the most subjects lately, whatever they weigh otherwise', () => {
    const organisations = [
      organisation('Ancien', { membersCount: 70 }),
      organisation('Vif'),
      organisation('Remuant'),
    ]

    expect(
      named(mostSpokenOrganisations(organisations, lately({ Vif: 9, Remuant: 4, Ancien: 1 }), 3)),
    ).toEqual(['Vif', 'Remuant', 'Ancien'])
  })

  it('never shows an organisation that said nothing lately', () => {
    expect(
      mostSpokenOrganisations([organisation('Ancien', { membersCount: 70 })], lately({}), 3),
    ).toEqual([])
  })

  it('settles those that spoke on as many subjects lately by the most engaged, then by name', () => {
    const organisations = [
      organisation('Zèbre'),
      organisation('Autruche'),
      organisation('Baleine', { membersCount: 40 }),
    ]

    expect(
      named(
        mostSpokenOrganisations(organisations, lately({ Zèbre: 2, Autruche: 2, Baleine: 2 }), 3),
      ),
    ).toEqual(['Baleine', 'Autruche', 'Zèbre'])
  })

  it('shows full rows only: the cards that would start a row are left out', () => {
    const spoke = Array.from({ length: ORGANISATIONS_PER_ROW + 1 }, (_, index) => `O${index}`)
    const each = lately(Object.fromEntries(spoke.map((name) => [name, 1])))

    expect(
      mostSpokenOrganisations(
        spoke.map((name) => organisation(name)),
        each,
        2 * ORGANISATIONS_PER_ROW,
      ),
    ).toHaveLength(ORGANISATIONS_PER_ROW)
  })
})
