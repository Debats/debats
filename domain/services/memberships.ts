/**
 * Ce qu'une affiliation est devenue : en cours, ou terminée.
 * Fonction pure, utile des deux côtés de la relation — la page d'une
 * personnalité en tire ses engagements, celle d'une organisation ses membres.
 */

import { Array as Arr } from 'effect'
import { isCurrentMembership, OrganisationMembership } from '../entities/organisation-membership'

/** Une affiliation vue d'un côté ou de l'autre : avec sa personnalité, ou avec son organisation */
export interface Affiliated {
  membership: OrganisationMembership
}

export interface SplitMemberships<T> {
  current: T[]
  former: T[]
}

/**
 * Les affiliations en cours d'un côté, celles qui ont pris fin de l'autre.
 * Le jour de référence est donné par l'appelant : le domaine ne lit pas l'horloge.
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
