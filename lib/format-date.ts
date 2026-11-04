import { dayOf, SITE_TIMEZONE } from '../domain/value-objects/day'

/*
 * Les dates du site sont lues dans le fuseau du site, jamais dans celui de la
 * machine qui rend la page : une colonne `date` (`stated_at`, `started_on`,
 * `ended_on`) arrive comme le minuit UTC de son jour, et un serveur à l'ouest
 * de Greenwich afficherait la veille — donc « février » pour un 1er mars.
 */
const inSiteTimezone = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: SITE_TIMEZONE, ...options })

const longForm = inSiteTimezone({ day: 'numeric', month: 'long', year: 'numeric' })
const monthForm = inSiteTimezone({ month: 'long', year: 'numeric' })
const shortForm = inSiteTimezone({ day: 'numeric', month: 'short', year: 'numeric' })

/** Date longue en français, ex. « 14 novembre 2023 ». */
export function formatDate(date: Date): string {
  return longForm.format(date)
}

/** Mois et année en français, ex. « novembre 2023 ». */
export function formatMonthYear(date: Date): string {
  return monthForm.format(date)
}

/** Date courte en français, ex. « 14 nov. 2023 ». */
export function formatShortDate(date: Date): string {
  return shortForm.format(date)
}

const ONE_DAY = 1000 * 60 * 60 * 24

/**
 * Depuis combien de temps, en jours du site : « Aujourd'hui », « Hier »,
 * « Il y a 5 jours », « Il y a 3 mois », puis le mois et l'année. Une date
 * énoncée est un jour (colonne `date`), pas un instant, donc l'écart se compte
 * de jour à jour : le compter en millisecondes donnait « Il y a -1 jours »
 * entre minuit et l'aube, quand « maintenant » en UTC est encore la veille.
 */
export function formatRelativeDate(date: Date, today: Date): string {
  const days = Math.round((dayOf(today).getTime() - dayOf(date).getTime()) / ONE_DAY)

  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} jours`
  const months = Math.floor(days / 30)
  if (months < 12) return `Il y a ${months} mois`
  return formatMonthYear(date)
}
