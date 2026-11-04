import { describe, expect, it } from 'vitest'
import { formatDate, formatMonthYear, formatRelativeDate, formatShortDate } from './format-date'

/*
 * Les entrées de ces tests sont des instants explicites, jamais `new Date(y, m, d)` :
 * ce constructeur-là lit le fuseau de la machine, et le test dirait alors autre
 * chose à Paris et à Tokyo. Une colonne `date` arrive comme le minuit UTC de son jour.
 */

describe('formatDate', () => {
  it('writes the long French form', () => {
    expect(formatDate(new Date('2023-11-14T12:00:00Z'))).toBe('14 novembre 2023')
  })

  it('does not zero-pad the day', () => {
    expect(formatDate(new Date('2021-02-03T12:00:00Z'))).toBe('3 février 2021')
  })

  it('reads a day of the database as its own day, wherever the server stands', () => {
    // Read in the timezone of a machine west of Greenwich, the midnight of a
    // `date` column would be the day before — « février » for a 1 March
    expect(formatDate(new Date('2021-03-01T00:00:00Z'))).toBe('1 mars 2021')
    expect(formatMonthYear(new Date('2021-03-01T00:00:00Z'))).toBe('mars 2021')
    expect(formatDate(new Date('2021-01-01T00:00:00Z'))).toBe('1 janvier 2021')
  })
})

describe('formatShortDate', () => {
  it('abbreviates the month in French', () => {
    expect(formatShortDate(new Date('2023-11-14T12:00:00Z'))).toBe('14 nov. 2023')
  })
})

describe('formatRelativeDate', () => {
  /** A day stated in the database, as a `date` column gives it */
  const stated = (day: string) => new Date(`${day}T00:00:00Z`)

  it('counts in days of the site, not in hours', () => {
    const today = new Date('2026-11-05T09:00:00Z')

    expect(formatRelativeDate(stated('2026-11-05'), today)).toBe("Aujourd'hui")
    expect(formatRelativeDate(stated('2026-11-04'), today)).toBe('Hier')
    expect(formatRelativeDate(stated('2026-10-31'), today)).toBe('Il y a 5 jours')
  })

  it('says today just after midnight in Paris, when UTC is still the day before', () => {
    // 00:30 in Paris on 5 November is 23:30 UTC on the 4th: counted in
    // milliseconds, a statement of the 5th read « Il y a -1 jours »
    const justAfterMidnight = new Date('2026-11-04T23:30:00Z')

    expect(formatRelativeDate(stated('2026-11-05'), justAfterMidnight)).toBe("Aujourd'hui")
  })

  it('turns to months, then to the month and the year', () => {
    const today = new Date('2026-11-05T09:00:00Z')

    expect(formatRelativeDate(stated('2026-08-05'), today)).toBe('Il y a 3 mois')
    expect(formatRelativeDate(stated('2024-03-01'), today)).toBe('mars 2024')
  })
})
