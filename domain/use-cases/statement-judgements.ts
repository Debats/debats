import { Effect } from 'effect'
import { judgeUnjudgedPositions } from '../aggregates/subject'
import { StatementAuthor } from '../entities/statement'
import { EventStore } from '../events/event-store'
import { StatementRepository } from '../repositories/statement-repository'
import { decideOnSubject } from './subject-stream'

/**
 * What whoever records a statement says of a position its author already
 * took on the subject: it goes with the one this statement takes, or against
 * it. Asked by the form when the two positions meet for the first time.
 */
export type PositionVerdict = { positionId: string; compatible: boolean }

const statements = Effect.serviceFunctions(StatementRepository)

/**
 * The verdicts the command keeps: those on a position the author really took
 * on the subject. The form asks about nothing else, so anything else is not
 * an answer to its question. An author opened in the same breath took none,
 * and without a verdict nothing is read.
 */
export const verdictsOnTakenPositions = (
  author: StatementAuthor | null,
  subjectId: string | null,
  verdicts: readonly PositionVerdict[],
) =>
  !author || !subjectId || verdicts.length === 0
    ? Effect.succeed<PositionVerdict[]>([])
    : Effect.map(statements.findByAuthorAndSubjectIds(author, [subjectId]), (taken) =>
        verdicts.filter((verdict) => taken.some((t) => t.position.id === verdict.positionId)),
      )

/**
 * Writes each verdict on the subject, against the position the statement was
 * just written on. A pair somebody already judged keeps its verdict: whoever
 * adds a statement answers a question nobody answered, and overturns nothing.
 */
export const recordVerdicts = (
  events: EventStore,
  subjectId: string,
  contributorId: string,
  positionId: string,
  verdicts: readonly PositionVerdict[],
) =>
  Effect.forEach(
    verdicts,
    (verdict) =>
      decideOnSubject(
        events,
        subjectId,
        contributorId,
        judgeUnjudgedPositions(positionId, verdict.positionId, verdict.compatible),
      ),
    { discard: true },
  )
