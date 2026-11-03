import { Option } from 'effect'
import { PublicFigure } from '../entities/public-figure'
import { MembershipWithOrganisation } from '../repositories/organisation-membership-repository'
import { OccupationHeld } from './occupations'

/**
 * A public figure as the admin API shows her to an automated contributor:
 * what she does and where she belongs, so the contributor reads before it
 * writes and names an affiliation by its id to remove it.
 */
export interface PublicFigureEnrichmentView {
  id: string
  slug: string
  name: string
  occupations: Array<{ slug: string; name: string; current: boolean }>
  affiliations: Array<{
    id: string
    organisation: { slug: string; name: string; acronym: string | null }
    role: string | null
    /** ISO day (YYYY-MM-DD) or null */
    startedOn: string | null
    endedOn: string | null
  }>
}

const dayOf = (date: Option.Option<Date>): string | null =>
  Option.match(date, { onNone: () => null, onSome: (d) => d.toISOString().slice(0, 10) })

export function publicFigureEnrichmentView(
  figure: PublicFigure,
  held: OccupationHeld[],
  memberships: MembershipWithOrganisation[],
): PublicFigureEnrichmentView {
  return {
    id: figure.id,
    slug: figure.slug,
    name: figure.name,
    occupations: held.map(({ occupation, current }) => ({
      slug: occupation.slug,
      name: occupation.name,
      current,
    })),
    affiliations: memberships.map(({ membership, organisation }) => ({
      id: membership.id,
      organisation: {
        slug: organisation.slug,
        name: organisation.name,
        acronym: organisation.acronym,
      },
      role: Option.getOrNull(membership.role),
      startedOn: dayOf(membership.startedOn),
      endedOn: dayOf(membership.endedOn),
    })),
  }
}
