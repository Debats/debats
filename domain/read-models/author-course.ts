import { courseOf } from '../services/position-course'
import { Compatibility } from './position-judgements'

/**
 * What the page « an author on a subject » tells of her course there: she
 * left a position for another, or she holds several together. With a single
 * position there is nothing to tell.
 */
export type CourseSummary =
  | {
      kind: 'changed'
      /** The position she left, from the first day of that stretch to the last day she stated it */
      from: { title: string; since: Date; until: Date }
      /** The position she took, and the first day she stated it */
      to: { title: string; since: Date }
    }
  | { kind: 'together'; positions: Array<{ title: string; since: Date }> }

export interface AuthorCourse {
  /** The positions she holds today: those she left are not hers any more */
  held: ReadonlySet<string>
  summary: CourseSummary | null
}

/** One statement of the author on the subject, reduced to what her course reads */
interface OnSubject {
  position: { id: string; title: string }
  statement: { statedAt: Date; createdAt: Date }
}

export function authorCourse(
  statements: ReadonlyArray<OnSubject>,
  compatible: Compatibility,
): AuthorCourse {
  const { held, moves } = courseOf(
    statements.map(({ position, statement }) => ({
      position: { id: position.id, title: position.title },
      statedAt: statement.statedAt,
      recordedAt: statement.createdAt,
    })),
    compatible,
  )
  const last = moves.at(-1)
  return {
    held: new Set(held.map(({ position }) => position.id)),
    summary: last
      ? {
          kind: 'changed',
          from: {
            title: last.from.position.title,
            since: last.from.since,
            until: last.from.lastStatedAt,
          },
          to: { title: last.to.position.title, since: last.to.statedAt },
        }
      : held.length > 1
        ? {
            kind: 'together',
            positions: held.map(({ position, since }) => ({ title: position.title, since })),
          }
        : null,
  }
}

export const courseTitle = (summary: CourseSummary): string => {
  if (summary.kind === 'changed') return 'A changé de position'
  const count = summary.positions.length
  return `Défend ${count === 2 ? 'deux' : count} positions`
}
