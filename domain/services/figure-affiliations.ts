/**
 * A public figure's affiliations as the rail of her page shows them: the ones
 * still running, then the ones that have ended. Pure functions, no data access.
 *
 * None of them is held up as the main one: the running affiliations stand as
 * equals, the way her occupations do.
 */

import { Option } from 'effect'
import { OrganisationMembership } from '../entities/organisation-membership'
import { MembershipWithOrganisation } from '../repositories/organisation-membership-repository'
import { splitMemberships } from './memberships'

export interface FigureAffiliations {
  /** Running affiliations, from the oldest to the most recent */
  current: MembershipWithOrganisation[]
  /** Ended affiliations, from the most recent to the oldest */
  former: MembershipWithOrganisation[]
}

const startedAt = (membership: OrganisationMembership): number | null =>
  Option.match(membership.startedOn, { onNone: () => null, onSome: (date) => date.getTime() })

const endedAt = (membership: OrganisationMembership): number | null =>
  Option.match(membership.endedOn, { onNone: () => null, onSome: (date) => date.getTime() })

const byName = (a: MembershipWithOrganisation, b: MembershipWithOrganisation): number =>
  a.organisation.name.localeCompare(b.organisation.name, 'fr')

/** The oldest affiliation first; the ones whose start is unknown bring up the rear. */
const byOldestStart = (a: MembershipWithOrganisation, b: MembershipWithOrganisation): number => {
  const left = startedAt(a.membership)
  const right = startedAt(b.membership)
  if (left === null && right === null) return byName(a, b)
  if (left === null) return 1
  if (right === null) return -1
  return left - right || byName(a, b)
}

/**
 * The most recent end first. An ended affiliation always has its end date,
 * since one without an end date is counted among the running: the fallback
 * below is unreachable, and only there so the comparator reads as a total order.
 */
const byMostRecentEnd = (a: MembershipWithOrganisation, b: MembershipWithOrganisation): number =>
  (endedAt(b.membership) ?? 0) - (endedAt(a.membership) ?? 0) || byName(a, b)

/**
 * A figure's affiliations, told apart between the running and the ended ones,
 * each side in its own order. The day of reference comes from the caller, and
 * what it is given is left as it was: each side is sorted on a copy.
 */
export function figureAffiliations(
  memberships: MembershipWithOrganisation[],
  today: Date,
): FigureAffiliations {
  const { current, former } = splitMemberships(memberships, today)

  return {
    current: [...current].sort(byOldestStart),
    former: [...former].sort(byMostRecentEnd),
  }
}
