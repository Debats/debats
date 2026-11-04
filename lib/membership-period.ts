import { Option } from 'effect'
import { OrganisationMembership } from '../domain/entities/organisation-membership'
import { dayOf } from '../domain/value-objects/day'
import { formatMonthYear } from './format-date'

/** « de mars 2020 », « d'avril 2020 » : le mois qui s'ouvre sur une voyelle prend l'élision */
const elided = (monthYear: string): string =>
  /^[aeiouâéêîôû]/i.test(monthYear) ? `d’${monthYear}` : `de ${monthYear}`

/**
 * Libellé de la période d'une affiliation : « depuis mars 2020 »,
 * « mars 2015 – juin 2020 », « jusqu'en juin 2020 », ou rien quand aucune date
 * n'est connue. Une affiliation annoncée pour plus tard est encore à venir :
 * elle dit « à partir de janvier 2027 », et non « depuis ». Le jour de
 * référence vient de l'appelant, comme partout ailleurs.
 */
export function membershipPeriodLabel(membership: OrganisationMembership, today: Date): string {
  const from = Option.map(membership.startedOn, formatMonthYear)
  const to = Option.map(membership.endedOn, formatMonthYear)
  const toCome = Option.exists(membership.startedOn, (start) => start > dayOf(today))

  if (Option.isSome(from) && Option.isSome(to)) return `${from.value} – ${to.value}`
  if (Option.isSome(from)) {
    return toCome ? `à partir ${elided(from.value)}` : `depuis ${from.value}`
  }
  if (Option.isSome(to)) return `jusqu’en ${to.value}`
  return ''
}
