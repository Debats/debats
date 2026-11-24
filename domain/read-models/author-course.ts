import { courseOf } from '../services/position-course'
import { Compatibility } from './position-judgements'

/** One statement of the author on the subject, reduced to what her course reads */
interface OnSubject {
  position: { id: string }
  statement: { statedAt: Date; createdAt: Date }
}

/**
 * The positions an author holds today on a subject, for the page « an author
 * on a subject »: one she left for another is not hers any more, so it does
 * not count among what she defends, nor among what others share with her.
 */
export function positionsHeld(
  statements: ReadonlyArray<OnSubject>,
  compatible: Compatibility,
): ReadonlySet<string> {
  const { held } = courseOf(
    statements.map(({ position, statement }) => ({
      position: { id: position.id },
      statedAt: statement.statedAt,
      recordedAt: statement.createdAt,
    })),
    compatible,
  )
  return new Set(held.map(({ position }) => position.id))
}
