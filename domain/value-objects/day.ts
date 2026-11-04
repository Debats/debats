/**
 * The day of the site. Débats.co is read from France, so one day of the site
 * begins and ends in Paris: the subject of the day turns over there, and an
 * affiliation ends there too. A day is held as the midnight that opens it in
 * UTC, which is how the `date` columns of the database arrive (`started_on`,
 * `ended_on`): a day is then only ever compared to another day, never to an
 * instant — otherwise an affiliation would end as its last day begins.
 */

/** Where the site's day begins and ends, and where its dates are read */
export const SITE_TIMEZONE = 'Europe/Paris'

/** `en-CA` writes a date as `2026-11-05`, which is the day's own name */
const inSiteTimezone = new Intl.DateTimeFormat('en-CA', {
  timeZone: SITE_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The name of the day an instant falls on, `2026-11-05`: what tells one day from another */
export const dayKey = (instant: Date): string => inSiteTimezone.format(instant)

/** The day an instant falls on, as the midnight that opens it in UTC */
export const dayOf = (instant: Date): Date => new Date(`${dayKey(instant)}T00:00:00Z`)

/** The year a day belongs to, as the site reads it: a 1 January is never the year before */
export const yearOf = (instant: Date): number => Number(dayKey(instant).slice(0, 4))
