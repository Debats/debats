/**
 * Analyses de l'activité d'une personnalité, calculées à partir de ses
 * prises de position : fonctions pures, sans accès aux données.
 */

export interface YearCount {
  year: number
  count: number
}

export interface ActivityPeriod {
  from: number
  to: number
}

export interface ThemeLike {
  id: string
  name: string
  slug: string
}

interface PrimaryThemeLink {
  themeId: string
  subjectId: string
}

export interface ThemeCount<T extends ThemeLike = ThemeLike> {
  theme: T
  count: number
}

const years = (dates: Date[]) => dates.map((date) => date.getFullYear())

/** Première et dernière année d'expression, ou null sans prise de position. */
export function activityPeriod(dates: Date[]): ActivityPeriod | null {
  if (dates.length === 0) return null
  const all = years(dates)
  return { from: Math.min(...all), to: Math.max(...all) }
}

/**
 * Nombre de prises de position par année, sur une plage continue de la
 * première à la dernière année (les années sans prise de position sont à 0).
 */
export function statementsPerYear(dates: Date[]): YearCount[] {
  const period = activityPeriod(dates)
  if (!period) return []

  const counts = new Map<number, number>()
  for (const year of years(dates)) counts.set(year, (counts.get(year) ?? 0) + 1)

  return Array.from({ length: period.to - period.from + 1 }, (_, offset) => {
    const year = period.from + offset
    return { year, count: counts.get(year) ?? 0 }
  })
}

/**
 * Répartition des sujets d'une personnalité par thème principal, du plus
 * fréquent au moins fréquent. Les thèmes sans sujet sont omis.
 */
export function themeDistribution<T extends ThemeLike>(
  subjectIds: string[],
  primaryLinks: PrimaryThemeLink[],
  themes: T[],
): ThemeCount<T>[] {
  const subjects = new Set(subjectIds)
  const countByTheme = new Map<string, number>()
  for (const link of primaryLinks) {
    if (subjects.has(link.subjectId)) {
      countByTheme.set(link.themeId, (countByTheme.get(link.themeId) ?? 0) + 1)
    }
  }

  return themes
    .flatMap((theme) => {
      const count = countByTheme.get(theme.id)
      return count ? [{ theme, count }] : []
    })
    .sort((a, b) => b.count - a.count)
}
