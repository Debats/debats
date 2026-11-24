import { formatShortDate } from '../../lib/format-date'
import { dayKey } from '../value-objects/day'

/**
 * The question the statement form asks when its author already took another
 * position on the subject and nobody has said yet whether the two go
 * together: « she already took X on that day » — do they contradict each
 * other, or are they compatible?
 */

/** A position the author already took on the subject, with the days she stated it, in order */
export interface TakenPosition {
  id: string
  title: string
  /** Days as `2022-02-05` */
  statedOn: string[]
}

/** Where the position already taken stands in time against the statement being recorded */
export type StanceTiming = 'before' | 'after' | 'same_day' | 'undated'

export interface StanceQuestion {
  position: { id: string; title: string }
  timing: StanceTiming
  /** The day the sentence names: the closest the author stated that position */
  day: string
}

/** What the author said on the subject, by position in order of first appearance */
export function takenPositions(
  statements: ReadonlyArray<{
    position: { id: string; title: string }
    statement: { statedAt: Date }
  }>,
): TakenPosition[] {
  const taken = new Map<string, TakenPosition>()
  for (const { position, statement } of statements) {
    const entry = taken.get(position.id) ?? { id: position.id, title: position.title, statedOn: [] }
    entry.statedOn = [...entry.statedOn, dayKey(statement.statedAt)].sort()
    taken.set(position.id, entry)
  }
  return Array.from(taken.values())
}

/**
 * Statements are often recorded out of order: the one being added may be
 * older than what the site already holds, or of the same day. The sentence
 * follows the dates, so that it never says « already » of something that
 * came later.
 */
function timingOf(
  statedOn: readonly string[],
  day: string,
): Pick<StanceQuestion, 'timing' | 'day'> {
  const last = statedOn.at(-1) ?? ''
  if (!day) return { timing: 'undated', day: last }
  if (statedOn.includes(day)) return { timing: 'same_day', day }
  const before = statedOn.filter((stated) => stated < day)
  return before.length > 0
    ? { timing: 'before', day: before.at(-1)! }
    : { timing: 'after', day: statedOn[0] }
}

/**
 * The positions to ask about: those the author took other than the one being
 * recorded, on a pair nobody judged. A position being created was never
 * judged against anything, so every position taken is asked about.
 */
export function stanceQuestions(
  taken: readonly TakenPosition[],
  verdict: (a: string, b: string) => boolean | undefined,
  chosen: { id: string } | 'new' | null,
  statedOn: string,
): StanceQuestion[] {
  if (chosen === null) return []
  return taken
    .filter(
      (position) =>
        chosen === 'new' ||
        (position.id !== chosen.id && verdict(position.id, chosen.id) === undefined),
    )
    .map((position) => ({
      position: { id: position.id, title: position.title },
      ...timingOf(position.statedOn, statedOn),
    }))
}

/** The sentence in three pieces, the title apart so that the form can set it in bold */
export function stanceSentence(
  authorName: string,
  { position, timing, day }: StanceQuestion,
): { lead: string; title: string; tail: string } {
  const on = formatShortDate(new Date(`${day}T00:00:00Z`))
  const title = `« ${position.title} »`
  switch (timing) {
    case 'before':
      return { lead: `${authorName} a déjà pris la position `, title, tail: ` le ${on}.` }
    case 'after':
      return { lead: `${authorName} a pris plus tard la position `, title, tail: `, le ${on}.` }
    case 'same_day':
      return { lead: `${authorName} a pris le même jour la position `, title, tail: '.' }
    case 'undated':
      return { lead: `${authorName} a aussi pris la position `, title, tail: `, le ${on}.` }
  }
}
