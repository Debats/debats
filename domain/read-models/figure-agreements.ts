/** A public figure as a pair names it */
export interface PairedFigure {
  id: string
  name: string
  slug: string
}

/**
 * Two public figures and how often they agree. They agree on a subject when
 * they hold a position in common there today: the reading every analysis
 * shares (`domain/services/stands.ts`).
 */
export interface FigureAgreement {
  a: PairedFigure
  b: PairedFigure
  /** The subjects on which they hold a position in common */
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
