import { Option } from 'effect'
import { OrganisationMembership } from '../../../../domain/entities/organisation-membership'
import { formatMonthYear } from '../../../../lib/format-date'

/**
 * Libellé de la période d'une affiliation : « depuis mars 2020 »,
 * « mars 2015 – juin 2020 », « jusqu'en juin 2020 », ou rien quand aucune date n'est connue.
 */
export function membershipPeriodLabel(membership: OrganisationMembership): string {
  const from = Option.map(membership.startedOn, formatMonthYear)
  const to = Option.map(membership.endedOn, formatMonthYear)

  if (Option.isSome(from) && Option.isSome(to)) return `${from.value} – ${to.value}`
  if (Option.isSome(from)) return `depuis ${from.value}`
  if (Option.isSome(to)) return `jusqu’en ${to.value}`
  return ''
}
