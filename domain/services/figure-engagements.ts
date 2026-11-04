/**
 * Les affiliations d'une personnalité telles que le rail de sa page les
 * montre : les engagements en cours, puis ceux qui ont pris fin.
 * Fonctions pures, sans accès aux données.
 *
 * Aucune affiliation n'est désignée principale : les engagements en cours
 * sont à égalité, comme les métiers le sont.
 */

import { Array as Arr, Option } from 'effect'
import { isCurrentMembership, OrganisationMembership } from '../entities/organisation-membership'
import { MembershipWithOrganisation } from '../repositories/organisation-membership-repository'

export interface Engagements {
  /** Affiliations en cours, de la plus ancienne à la plus récente */
  current: MembershipWithOrganisation[]
  /** Affiliations terminées, de la plus récente à la plus ancienne */
  past: MembershipWithOrganisation[]
}

const startedAt = (membership: OrganisationMembership): number | null =>
  Option.match(membership.startedOn, { onNone: () => null, onSome: (date) => date.getTime() })

const endedAt = (membership: OrganisationMembership): number | null =>
  Option.match(membership.endedOn, { onNone: () => null, onSome: (date) => date.getTime() })

const byName = (a: MembershipWithOrganisation, b: MembershipWithOrganisation): number =>
  a.organisation.name.localeCompare(b.organisation.name, 'fr')

/** L'engagement le plus ancien d'abord ; ceux dont on ignore le début ferment la marche. */
const byOldestStart = (a: MembershipWithOrganisation, b: MembershipWithOrganisation): number => {
  const left = startedAt(a.membership)
  const right = startedAt(b.membership)
  if (left === null && right === null) return byName(a, b)
  if (left === null) return 1
  if (right === null) return -1
  return left - right || byName(a, b)
}

/** La fin la plus récente d'abord. Une affiliation terminée a toujours sa date de fin. */
const byMostRecentEnd = (a: MembershipWithOrganisation, b: MembershipWithOrganisation): number =>
  (endedAt(b.membership) ?? 0) - (endedAt(a.membership) ?? 0) || byName(a, b)

/** Les affiliations d'une personnalité, séparées entre engagements en cours et passés */
export function figureEngagements(
  memberships: MembershipWithOrganisation[],
  today: Date = new Date(),
): Engagements {
  const [ended, running] = Arr.partition(memberships, ({ membership }) =>
    isCurrentMembership(membership, today),
  )

  return { current: running.sort(byOldestStart), past: ended.sort(byMostRecentEnd) }
}
