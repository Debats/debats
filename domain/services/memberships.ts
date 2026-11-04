/**
 * What has become of an affiliation: running, or ended.
 * A pure function, of use on both sides of the relation — a public figure's
 * page draws her engagements from it, an organisation's page its members.
 */

import { Array as Arr } from 'effect'
import { isCurrentMembership, OrganisationMembership } from '../entities/organisation-membership'

/** An affiliation seen from one side or the other: with its figure, or with its organisation */
export interface Affiliated {
  membership: OrganisationMembership
}

export interface SplitMemberships<T> {
  current: T[]
  former: T[]
}

/**
 * The running affiliations on one side, the ones that have ended on the other.
 * The day of reference is given by the caller: the domain reads no clock.
 */
export function splitMemberships<T extends Affiliated>(
  memberships: T[],
  today: Date,
): SplitMemberships<T> {
  const [former, current] = Arr.partition(memberships, ({ membership }) =>
    isCurrentMembership(membership, today),
  )
  return { current, former }
}
