import { dayKey } from '../value-objects/day'

/** One statement of a public figure, as the search for changes reads it */
export interface StatedPosition {
  figure: { id: string; name: string; slug: string }
  subject: { id: string; title: string; slug: string }
  position: { id: string; title: string }
  statedAt: Date
  createdAt: Date
}

/** A position on one side of a change, with the day it was last or first stated */
export interface ChangeSide {
  title: string
  statedAt: Date
}

/** A public figure who left a position for another on a subject */
export interface PositionChange {
  figure: StatedPosition['figure']
  subject: StatedPosition['subject']
  /** The position she held, and the last day she stated it */
  from: ChangeSide
  /** The position she took, and the first day she stated it */
  to: ChangeSide
}

const byStatedThenRecorded = (a: StatedPosition, b: StatedPosition) =>
  a.statedAt.getTime() - b.statedAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime()

/**
 * The last move of one figure on one subject, if she made one. Two positions
 * stated the same day are held together, not one after the other: the order
 * they were recorded in says nothing of the order they were said in, so no
 * change is read from it.
 */
function lastChange(statements: StatedPosition[]): PositionChange | null {
  const ordered = [...statements].sort(byStatedThenRecorded)
  const last = ordered.at(-1)
  if (!last) return null
  // Where the position she holds today begins: the statements before it are the ones she left
  let arrival = ordered.length - 1
  while (arrival > 0 && ordered[arrival - 1].position.id === last.position.id) arrival--
  const before = ordered[arrival - 1]
  const first = ordered[arrival]
  if (!before || dayKey(before.statedAt) === dayKey(first.statedAt)) return null
  return {
    figure: last.figure,
    subject: last.subject,
    from: { title: before.position.title, statedAt: before.statedAt },
    to: { title: first.position.title, statedAt: first.statedAt },
  }
}

/**
 * The latest changes of position across the site: for each public figure and
 * subject, the last time she left a position for another, the most recent
 * moves first.
 */
export function latestChanges(
  statements: readonly StatedPosition[],
  limit: number,
): PositionChange[] {
  const groups = new Map<string, StatedPosition[]>()
  for (const entry of statements) {
    const key = `${entry.figure.id}:${entry.subject.id}`
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return Array.from(groups.values())
    .map(lastChange)
    .filter((change) => change !== null)
    .sort((a, b) => b.to.statedAt.getTime() - a.to.statedAt.getTime())
    .slice(0, limit)
}
