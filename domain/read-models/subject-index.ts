import { SubjectActivitySummary } from '../repositories/subject-repository'

/** A theme as the subjects index names it */
export interface ThemeRef {
  id: string
  name: string
  slug: string
  description: string
}

/** One subject of the index, with the theme it belongs to first */
export interface SubjectIndexEntry extends SubjectActivitySummary {
  primaryTheme: ThemeRef | null
}

/** A theme's block on the index: its most documented subject, then the others */
export interface ThemeSection {
  /** null for the subjects without a primary theme */
  theme: ThemeRef | null
  featured: SubjectIndexEntry
  others: SubjectIndexEntry[]
  subjectsCount: number
}

export interface SubjectIndexTotals {
  subjects: number
  themes: number
  statements: number
}

const byStatements = (a: SubjectIndexEntry, b: SubjectIndexEntry) =>
  b.statementsCount - a.statementsCount || a.title.localeCompare(b.title, 'fr')

const UNTHEMED = 'unthemed'

/**
 * The index's sections: one per theme that has subjects, the biggest first,
 * then the subjects without a theme. Within a section, most documented first.
 */
export function groupSubjectsByTheme(entries: SubjectIndexEntry[]): ThemeSection[] {
  const groups = new Map<string, { theme: ThemeRef | null; subjects: SubjectIndexEntry[] }>()
  for (const entry of entries) {
    const key = entry.primaryTheme?.id ?? UNTHEMED
    const group = groups.get(key) ?? { theme: entry.primaryTheme, subjects: [] }
    group.subjects.push(entry)
    groups.set(key, group)
  }

  const sections = Array.from(groups.values()).map(({ theme, subjects }) => {
    const [featured, ...others] = [...subjects].sort(byStatements)
    return { theme, featured, others, subjectsCount: subjects.length }
  })

  return sections.sort((a, b) => {
    if (a.theme === null) return 1
    if (b.theme === null) return -1
    return b.subjectsCount - a.subjectsCount || a.theme.name.localeCompare(b.theme.name, 'fr')
  })
}

/** Up to this many statements, a subject still needs documenting */
const DOCUMENTED_THRESHOLD = 2

/** The subjects a contributor could enrich with a single sourced quote, the barest first */
export function subjectsToDocument(entries: SubjectIndexEntry[], limit = 5): SubjectIndexEntry[] {
  return entries
    .filter((e) => e.statementsCount <= DOCUMENTED_THRESHOLD)
    .sort((a, b) => a.statementsCount - b.statementsCount || a.title.localeCompare(b.title, 'fr'))
    .slice(0, limit)
}

/** The figures of the hero: how much the site covers */
export function subjectIndexTotals(entries: SubjectIndexEntry[]): SubjectIndexTotals {
  const themes = new Set(entries.flatMap((e) => (e.primaryTheme ? [e.primaryTheme.id] : [])))
  return {
    subjects: entries.length,
    themes: themes.size,
    statements: entries.reduce((sum, e) => sum + e.statementsCount, 0),
  }
}
