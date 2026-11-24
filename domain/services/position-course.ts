import { Compatibility } from '../read-models/position-judgements'
import { dayKey } from '../value-objects/day'

/**
 * The course of one author on one subject: which positions she holds today,
 * and each time she left one for another.
 *
 * Taking a position leaves the ones it contradicts, and only those: two
 * positions judged compatible are held together. Two positions stated the
 * same day are held together too, whatever was judged of them: the order
 * they were recorded in says nothing of the order they were said in.
 */

/** One statement, reduced to what the course reads */
export interface CourseEntry<P extends { id: string }> {
  position: P
  statedAt: Date
  /** When the site recorded it: what orders two statements of the same day */
  recordedAt: Date
}

/** A position the author holds, or held until she left it */
export interface HeldPosition<P> {
  position: P
  /** The first day of this stretch: a position left then taken again starts anew */
  since: Date
  lastStatedAt: Date
}

export interface Move<P> {
  from: HeldPosition<P>
  /** The position taken, and the first day she stated it */
  to: { position: P; statedAt: Date }
}

export interface Course<P> {
  /** The positions she holds today, in the order she took them */
  held: HeldPosition<P>[]
  /** Each time she left a position for another, in time order */
  moves: Move<P>[]
}

const byStatedThenRecorded = <P extends { id: string }>(a: CourseEntry<P>, b: CourseEntry<P>) =>
  a.statedAt.getTime() - b.statedAt.getTime() || a.recordedAt.getTime() - b.recordedAt.getTime()

/** The statements day by day, in time order; within a day, in the order they were recorded */
function byDay<P extends { id: string }>(
  entries: ReadonlyArray<CourseEntry<P>>,
): CourseEntry<P>[][] {
  const days = new Map<string, CourseEntry<P>[]>()
  for (const entry of [...entries].sort(byStatedThenRecorded)) {
    const key = dayKey(entry.statedAt)
    days.set(key, [...(days.get(key) ?? []), entry])
  }
  return Array.from(days.values())
}

/**
 * The course is read a day at a time, never a statement at a time: what she
 * said on one day is one stance, so a position she restates that day is not
 * left for another she takes the same day, whichever the site recorded first.
 */
export function courseOf<P extends { id: string }>(
  entries: ReadonlyArray<CourseEntry<P>>,
  compatible: Compatibility,
): Course<P> {
  let held: HeldPosition<P>[] = []
  const moves: Move<P>[] = []

  for (const stated of byDay(entries)) {
    const saidToday = (h: HeldPosition<P>) => stated.some((s) => s.position.id === h.position.id)
    const statedAt = stated[0].statedAt
    held = held.map((h) => (saidToday(h) ? { ...h, lastStatedAt: statedAt } : h))

    for (const { position } of stated) {
      if (held.some((h) => h.position.id === position.id)) continue
      const left = held.filter((h) => !saidToday(h) && !compatible(h.position.id, position.id))
      if (left.length > 0) {
        // Several positions left at once make one move, from the one she stated last
        const from = left.reduce((last, h) => (h.lastStatedAt > last.lastStatedAt ? h : last))
        moves.push({ from, to: { position, statedAt } })
      }
      held = [
        ...held.filter((h) => !left.includes(h)),
        { position, since: statedAt, lastStatedAt: statedAt },
      ]
    }
  }
  return { held, moves }
}
