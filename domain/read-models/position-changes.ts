import { courseOf } from '../services/position-course'
import { Compatibility } from './position-judgements'

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

/**
 * The last move of one figure on one subject, if she made one. What a move
 * is — a position left for one it contradicts, never two positions held
 * together — is the course's to say.
 */
function lastChange(
  statements: StatedPosition[],
  compatible: Compatibility,
): PositionChange | null {
  const { moves } = courseOf(
    statements.map(({ position, statedAt, createdAt }) => ({
      position,
      statedAt,
      recordedAt: createdAt,
    })),
    compatible,
  )
  const last = moves.at(-1)
  if (!last) return null
  const [{ figure, subject }] = statements
  return {
    figure,
    subject,
    from: { title: last.from.position.title, statedAt: last.from.lastStatedAt },
    to: { title: last.to.position.title, statedAt: last.to.statedAt },
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
  compatible: Compatibility,
): PositionChange[] {
  const groups = new Map<string, StatedPosition[]>()
  for (const entry of statements) {
    const key = `${entry.figure.id}:${entry.subject.id}`
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return Array.from(groups.values())
    .map((group) => lastChange(group, compatible))
    .filter((change) => change !== null)
    .sort((a, b) => b.to.statedAt.getTime() - a.to.statedAt.getTime())
    .slice(0, limit)
}
