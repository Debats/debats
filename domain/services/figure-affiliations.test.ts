import { describe, expect, it } from 'vitest'
import { createMembership } from '../entities/entity-test-helpers'
import { MembershipWithOrganisation } from '../repositories/organisation-membership-repository'
import { figureAffiliations } from './figure-affiliations'

const today = new Date('2026-11-04')

const affiliation = (
  name: string,
  params: { acronym?: string; role?: string; startedOn?: string; endedOn?: string } = {},
): MembershipWithOrganisation => ({
  membership: createMembership({
    organisationId: `org-${name}`,
    publicFigureId: 'figure-1',
    role: params.role,
    startedOn: params.startedOn ? new Date(params.startedOn) : undefined,
    endedOn: params.endedOn ? new Date(params.endedOn) : undefined,
    createdBy: 'contributor-1',
  }),
  organisation: {
    id: `org-${name}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    acronym: params.acronym ?? null,
    organisationType: 'political_party',
  },
})

const names = (affiliations: MembershipWithOrganisation[]) =>
  affiliations.map(({ organisation }) => organisation.name)

describe('figureAffiliations', () => {
  it('separates the memberships that are still running from those that ended', () => {
    const affiliations = figureAffiliations(
      [
        affiliation('Mouvement démocrate', { acronym: 'MoDem' }),
        affiliation('Union pour la démocratie française', {
          acronym: 'UDF',
          endedOn: '2007-01-01',
        }),
      ],
      today,
    )

    expect(names(affiliations.current)).toEqual(['Mouvement démocrate'])
    expect(names(affiliations.former)).toEqual(['Union pour la démocratie française'])
  })

  it('counts a membership ending in the future as a running one', () => {
    const affiliations = figureAffiliations(
      [affiliation('Attac', { endedOn: '2027-06-30' })],
      today,
    )

    expect(names(affiliations.current)).toEqual(['Attac'])
    expect(affiliations.former).toEqual([])
  })

  it('leads the running memberships with the longest-standing one, the undated ones last', () => {
    const affiliations = figureAffiliations(
      [
        affiliation('Oxfam France', { startedOn: '2019-09-01' }),
        affiliation('Médecins du Monde'),
        affiliation('La France insoumise', { startedOn: '2016-02-10' }),
      ],
      today,
    )

    expect(names(affiliations.current)).toEqual([
      'La France insoumise',
      'Oxfam France',
      'Médecins du Monde',
    ])
  })

  it('orders the ended memberships from the most recent to the oldest', () => {
    const affiliations = figureAffiliations(
      [
        affiliation('Centre démocrate', { endedOn: '1976-05-23' }),
        affiliation('Union pour la démocratie française', { endedOn: '2007-01-01' }),
        affiliation('Centre des démocrates sociaux', { endedOn: '1995-11-25' }),
      ],
      today,
    )

    expect(names(affiliations.former)).toEqual([
      'Union pour la démocratie française',
      'Centre des démocrates sociaux',
      'Centre démocrate',
    ])
  })

  it('keeps two spells in the same organisation apart', () => {
    const affiliations = figureAffiliations(
      [
        affiliation('Renaissance', { endedOn: '2019-06-26' }),
        affiliation('Renaissance', { endedOn: '2019-12-31' }),
      ],
      today,
    )

    const ids = affiliations.former.map(({ membership }) => membership.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('sorts same-dated memberships by name, so the order never wavers', () => {
    const affiliations = figureAffiliations(
      [affiliation('Oxfam France'), affiliation('Attac'), affiliation('Médecins du Monde')],
      today,
    )

    expect(names(affiliations.current)).toEqual(['Attac', 'Médecins du Monde', 'Oxfam France'])
  })

  it('has nothing to show without any membership', () => {
    expect(figureAffiliations([], today)).toEqual({ current: [], former: [] })
  })
})
