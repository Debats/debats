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

/** One statement in her course, and what it changed to the positions she held */
export interface Step<E extends CourseEntry<{ id: string }>> {
  /** The statement as it was given, with whatever else it carries */
  entry: E
  /**
   * The positions she left for this one, and the ones she kept beside it;
   * `null` when the statement restates a position she already holds.
   */
  taken: { left: HeldPosition<E['position']>[]; kept: HeldPosition<E['position']>[] } | null
}

export interface Course<E extends CourseEntry<{ id: string }>> {
  /** The positions she holds today, in the order she took them */
  held: HeldPosition<E['position']>[]
  /** Each time she left a position for another, in time order */
  moves: Move<E['position']>[]
  /** Every statement, in time order */
  steps: Step<E>[]
}

const byStatedThenRecorded = (a: CourseEntry<{ id: string }>, b: CourseEntry<{ id: string }>) =>
  a.statedAt.getTime() - b.statedAt.getTime() || a.recordedAt.getTime() - b.recordedAt.getTime()

/** The statements day by day, in time order; within a day, in the order they were recorded */
function byDay<E extends CourseEntry<{ id: string }>>(entries: ReadonlyArray<E>): E[][] {
  const days = new Map<string, E[]>()
  for (const entry of [...entries].sort(byStatedThenRecorded)) {
    const key = dayKey(entry.statedAt)
    days.set(key, [...(days.get(key) ?? []), entry])
  }
  return Array.from(days.values())
}

/** Among several positions, the one she stated the most recently */
export const lastStated = <P>(positions: ReadonlyArray<HeldPosition<P>>): HeldPosition<P> =>
  positions.reduce((last, h) => (h.lastStatedAt > last.lastStatedAt ? h : last))

/** Several positions left at once make one move, from the one she stated last */
const movesIn = <E extends CourseEntry<{ id: string }>>(steps: Step<E>[]): Move<E['position']>[] =>
  steps.flatMap(({ entry, taken }) =>
    taken && taken.left.length > 0
      ? [
          {
            from: lastStated(taken.left),
            to: { position: entry.position, statedAt: entry.statedAt },
          },
        ]
      : [],
  )

/**
 * The course is read a day at a time, never a statement at a time: what she
 * said on one day is one stance, so a position she restates that day is not
 * left for another she takes the same day, whichever the site recorded first.
 */
export function courseOf<E extends CourseEntry<{ id: string }>>(
  entries: ReadonlyArray<E>,
  compatible: Compatibility,
): Course<E> {
  type Held = HeldPosition<E['position']>
  let held: Held[] = []
  const steps: Step<E>[] = []

  for (const stated of byDay(entries)) {
    const saidToday = (h: Held) => stated.some((s) => s.position.id === h.position.id)
    const statedAt = stated[0].statedAt
    held = held.map((h) => (saidToday(h) ? { ...h, lastStatedAt: statedAt } : h))

    for (const entry of stated) {
      const { position } = entry
      if (held.some((h) => h.position.id === position.id)) {
        steps.push({ entry, taken: null })
        continue
      }
      const left = held.filter((h) => !saidToday(h) && !compatible(h.position.id, position.id))
      const kept = held.filter((h) => !left.includes(h))
      steps.push({ entry, taken: { left, kept } })
      held = [...kept, { position, since: statedAt, lastStatedAt: statedAt }]
    }
  }
  return { held, moves: movesIn(steps), steps }
}
