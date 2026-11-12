/** A public figure as a pair names it */
export interface PairedFigure {
  id: string
  name: string
  slug: string
}

/**
 * Two public figures and how often they agree. They agree on a subject when
 * they share at least one position on it: the same reading as the allies of
 * an author's page (`domain/services/author-analyses.ts`).
 */
export interface FigureAgreement {
  a: PairedFigure
  b: PairedFigure
  /** The subjects on which they share a position */
  agreedSubjects: number
  /** The subjects both spoke on */
  commonSubjects: number
  /** A few of the subjects they agree on */
  examples: Array<{ title: string; slug: string }>
}

/**
 * Only public figures who spoke on this many subjects are paired: two voices
 * that met on a single subject agree on all or nothing, which says little.
 */
export const MIN_SUBJECTS_TO_PAIR = 10

const byAgreement = (x: FigureAgreement, y: FigureAgreement) =>
  y.agreedSubjects - x.agreedSubjects ||
  x.commonSubjects - y.commonSubjects ||
  x.a.name.localeCompare(y.a.name, 'fr') ||
  x.b.name.localeCompare(y.b.name, 'fr')

/**
 * The pairs the home page shows: those that agree on the most subjects, each
 * public figure appearing once. Without that, the three or four most present
 * figures would fill every card between themselves. The choice is mechanical:
 * nobody picks which pair is worth showing.
 */
export function pairsToShow(
  agreements: readonly FigureAgreement[],
  limit: number,
): FigureAgreement[] {
  const shown: FigureAgreement[] = []
  const seen = new Set<string>()
  for (const pair of [...agreements].sort(byAgreement)) {
    if (shown.length === limit) break
    if (pair.agreedSubjects === 0 || seen.has(pair.a.id) || seen.has(pair.b.id)) continue
    shown.push(pair)
    seen.add(pair.a.id).add(pair.b.id)
  }
  return shown
}
