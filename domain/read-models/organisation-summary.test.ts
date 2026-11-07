import { describe, it, expect } from 'vitest'
import {
  OrganisationSummary,
  ORGANISATIONS_PER_GROUP,
  groupOrganisationsByType,
  isTruncated,
  orderByEngagement,
  organisationsOfType,
  organisationsOfTypeHref,
  organisationsOfTypeIntro,
} from './organisation-summary'

const summary = (
  name: string,
  overrides: Partial<OrganisationSummary> = {},
): OrganisationSummary => ({
  id: name,
  name,
  slug: name.toLowerCase(),
  acronym: null,
  organisationType: 'political_party',
  presentation: '',
  membersCount: 0,
  statementsCount: 0,
  subjectsCount: 0,
  ...overrides,
})

describe('organisationsOfType', () => {
  it('keeps the organisations of that type, from the most engaged to the least', () => {
    const parties = organisationsOfType(
      [
        summary('Discrète', { statementsCount: 1, membersCount: 0 }),
        summary('Syndicat', { organisationType: 'union', statementsCount: 50 }),
        summary('Parlante', { statementsCount: 9, membersCount: 0 }),
        summary('Nombreuse', { statementsCount: 0, membersCount: 5 }),
      ],
      'political_party',
    )

    expect(parties.map((o) => o.name)).toEqual(['Parlante', 'Nombreuse', 'Discrète'])
  })

  it('names them in alphabetical order when they are as engaged', () => {
    const parties = organisationsOfType(
      [
        summary('Zola', { statementsCount: 2, membersCount: 1 }),
        summary('Éluard', { statementsCount: 1, membersCount: 2 }),
        summary('Aragon', { statementsCount: 3, membersCount: 0 }),
      ],
      'political_party',
    )

    expect(parties.map((o) => o.name)).toEqual(['Aragon', 'Éluard', 'Zola'])
  })
})

describe('orderByEngagement', () => {
  it('orders from the most engaged to the least', () => {
    const ordered = orderByEngagement([
      summary('Discrète', { statementsCount: 1 }),
      summary('Parlante', { statementsCount: 9 }),
      summary('Nombreuse', { membersCount: 5 }),
    ])

    expect(ordered.map((o) => o.name)).toEqual(['Parlante', 'Nombreuse', 'Discrète'])
  })

  it('leaves the given list untouched', () => {
    const organisations = [
      summary('Discrète', { statementsCount: 1 }),
      summary('Parlante', { statementsCount: 9 }),
    ]

    orderByEngagement(organisations)

    expect(organisations.map((o) => o.name)).toEqual(['Discrète', 'Parlante'])
  })
})

describe('isTruncated', () => {
  const partiesOf = (count: number, shown: number) =>
    groupOrganisationsByType(
      Array.from({ length: count }, (_, i) => summary(`Parti ${i}`)),
      shown,
    )[0]

  it('is true when the index hides at least one organisation of the group', () => {
    expect(isTruncated(partiesOf(9, 8))).toBe(true)
  })

  it('is false when the index shows the whole group', () => {
    expect(isTruncated(partiesOf(8, 8))).toBe(false)
    expect(isTruncated(partiesOf(3, 8))).toBe(false)
  })
})

describe('organisationsOfTypeIntro', () => {
  it('says there is none', () => {
    expect(organisationsOfTypeIntro(0)).toBe(
      'Aucune organisation de ce type n’est encore référencée.',
    )
  })

  it('does not promise an order when there is only one', () => {
    expect(organisationsOfTypeIntro(1)).toBe(
      'Une seule organisation de ce type est référencée pour l’instant.',
    )
  })

  it('announces the order as soon as there are several', () => {
    expect(organisationsOfTypeIntro(50)).toBe(
      '50 organisations, des plus engagées dans le débat public aux moins.',
    )
  })
})

describe('organisationsOfTypeHref', () => {
  it('addresses the page of a whole group', () => {
    expect(organisationsOfTypeHref('political_party')).toBe('/o/type/partis-politiques')
  })
})

describe('groupOrganisationsByType', () => {
  it('keeps the order of the types and drops the empty groups', () => {
    const groups = groupOrganisationsByType(
      [
        summary('Syndicat', { organisationType: 'union', statementsCount: 1 }),
        summary('Parti', { organisationType: 'political_party', statementsCount: 1 }),
      ],
      ORGANISATIONS_PER_GROUP,
    )

    expect(groups.map((group) => group.type)).toEqual(['political_party', 'union'])
    expect(groups.map((group) => group.label)).toEqual(['Partis politiques', 'Syndicats'])
  })

  it('names the whole group as it reads in the link to it', () => {
    const groups = groupOrganisationsByType(
      [
        summary('Greenpeace', { organisationType: 'ngo', statementsCount: 1 }),
        summary('Parti', { organisationType: 'political_party', statementsCount: 1 }),
      ],
      ORGANISATIONS_PER_GROUP,
    )

    expect(groups.map((group) => group.inSentence)).toEqual(['partis politiques', 'ONG'])
  })

  it('shows at most the asked number of cards, the most engaged ones', () => {
    const parties = Array.from({ length: 5 }, (_, i) =>
      summary(`Parti ${i}`, { statementsCount: i }),
    )

    const [group] = groupOrganisationsByType(parties, 3)

    expect(group.organisations.map((o) => o.name)).toEqual(['Parti 4', 'Parti 3', 'Parti 2'])
  })

  it('counts the whole group, shown or not, so the page can link to the rest', () => {
    const parties = Array.from({ length: 5 }, (_, i) =>
      summary(`Parti ${i}`, { statementsCount: i }),
    )

    const [group] = groupOrganisationsByType(parties, 3)

    expect(group.total).toBe(5)
    expect(group.href).toBe('/o/type/partis-politiques')
  })
})
