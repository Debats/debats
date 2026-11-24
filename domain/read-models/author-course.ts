import { courseOf } from '../services/position-course'
import { historyOf, HistoryEntry, OnSubject, PositionHistory } from './position-history'
import { Compatibility } from './position-judgements'

/** What the page « an author on a subject » reads of her course, walked once */
export interface AuthorCourse<T extends OnSubject> {
  /**
   * The positions she holds today: one she left for another is not hers any
   * more, so it does not count among what she defends, nor among what others
   * share with her.
   */
  held: ReadonlySet<string>
  /** Her statements over time, lane by lane; `null` when there is no history to tell */
  history: PositionHistory<T> | null
}

export function authorCourse<T extends OnSubject>(
  statements: ReadonlyArray<T>,
  compatible: Compatibility,
): AuthorCourse<T> {
  const { held, steps } = courseOf(
    statements.map(
      (given): HistoryEntry<T> => ({
        position: given.position,
        statedAt: given.statement.statedAt,
        recordedAt: given.statement.createdAt,
        given,
      }),
    ),
    compatible,
  )
  return {
    held: new Set(held.map(({ position }) => position.id)),
    history: historyOf(steps),
  }
}
