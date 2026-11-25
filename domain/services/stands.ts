import { Compatibility, courseOf } from './position-course'

/**
 * Where everyone stands today: the one reading every analysis compares
 * authors with, on the page of an author as across the whole site.
 *
 * An author stands, on a subject, on the positions she holds today — the end
 * of her course there (`position-course.ts`): a position she left for another
 * is not hers any more. Two authors are then with each other, apart, or
 * beside each other, and a position is supported by those who hold it.
 */

/** One statement, reduced to what a stand is read from */
export interface Taken<P extends { id: string }> {
  /** Who took the position: `authorKey` of the author */
  authorKey: string
  subjectId: string
  position: P
  statedAt: Date
  /** When the site recorded it: what orders two statements of the same day */
  recordedAt: Date
}

/** author key → subject id → the positions she holds there today, in the order she took them */
export type Stands<P> = Map<string, Map<string, P[]>>

export function standsOf<P extends { id: string }>(
  taken: ReadonlyArray<Taken<P>>,
  compatible: Compatibility,
): Stands<P> {
  const said = new Map<string, Map<string, Taken<P>[]>>()
  for (const entry of taken) {
    const bySubject = said.get(entry.authorKey) ?? new Map<string, Taken<P>[]>()
    bySubject.set(entry.subjectId, [...(bySubject.get(entry.subjectId) ?? []), entry])
    said.set(entry.authorKey, bySubject)
  }

  const stands: Stands<P> = new Map()
  said.forEach((bySubject, authorKey) => {
    const held = new Map<string, P[]>()
    bySubject.forEach((entries, subjectId) =>
      held.set(
        subjectId,
        courseOf(entries, compatible).held.map(({ position }) => position),
      ),
    )
    stands.set(authorKey, held)
  })
  return stands
}

/**
 * How two authors stand towards each other on a subject: with each other
 * when they share a position; apart when they share none and one of hers
 * contradicts one of theirs; beside each other when they only hold compatible
 * positions — they did not say the same thing, and nothing one said goes
 * against what the other said.
 */
export type Relation = 'with' | 'apart' | 'beside'

export function relationOf(
  mine: ReadonlyArray<{ id: string }>,
  theirs: ReadonlyArray<{ id: string }>,
  compatible: Compatibility,
): Relation {
  if (mine.some((m) => theirs.some((t) => t.id === m.id))) return 'with'
  return mine.some((m) => theirs.some((t) => !compatible(m.id, t.id))) ? 'apart' : 'beside'
}

/** Who supports what on a subject */
export interface Support {
  /** position id → how many authors hold it */
  byPosition: Map<string, number>
  /** How many authors stand on the subject */
  authors: number
}

/** subject id → who holds each of its positions today */
export function supportOf<P extends { id: string }>(stands: Stands<P>): Map<string, Support> {
  const support = new Map<string, Support>()
  stands.forEach((bySubject) =>
    bySubject.forEach((positions, subjectId) => {
      const entry = support.get(subjectId) ?? { byPosition: new Map<string, number>(), authors: 0 }
      positions.forEach(({ id }) => entry.byPosition.set(id, (entry.byPosition.get(id) ?? 0) + 1))
      entry.authors += 1
      support.set(subjectId, entry)
    }),
  )
  return support
}

/** How many authors hold the most supported position of a subject */
export const leadingSupport = ({ byPosition }: Support): number =>
  Math.max(...Array.from(byPosition.values()))

/** Whether one of these positions is the most supported of the subject, or ties with it */
export const standsWithLeading = (
  positions: ReadonlyArray<{ id: string }>,
  support: Support,
): boolean => {
  const most = leadingSupport(support)
  return positions.some(({ id }) => support.byPosition.get(id) === most)
}
