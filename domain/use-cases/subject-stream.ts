import { Effect } from 'effect'
import {
  findPosition,
  replaySubject,
  SUBJECT_STREAM,
  SubjectDecision,
  SubjectState,
} from '../aggregates/subject'
import { SubjectEvent } from '../aggregates/subject-events'
import { Position } from '../entities/position'
import { EventStore } from '../events/event-store'
import { AggregateStream, Decided, decideOn, RenderedFrom, requireState } from './aggregate-stream'

export const subjectAggregate: AggregateStream<SubjectState, SubjectEvent> = {
  streamType: SUBJECT_STREAM,
  notFound: 'Sujet introuvable.',
  replay: replaySubject,
  isLive: (state) => state.deletedAt === null,
}

export const decideOnSubject = (
  events: EventStore,
  subjectId: string,
  actorId: string,
  decide: SubjectDecision,
  renderedFrom?: RenderedFrom,
) => decideOn(subjectAggregate, events, subjectId, actorId, decide, renderedFrom)

export const requireSubjectState = (state: SubjectState | null) =>
  requireState(subjectAggregate, state)

/** The position the decision just wrote: a subject without it has a broken replay */
export const writtenPosition =
  (positionId: string) =>
  ({ state }: Decided<SubjectState>): Effect.Effect<Position> => {
    const position = findPosition(state, positionId)
    return position
      ? Effect.succeed(position)
      : Effect.dieMessage(`The position ${positionId} just written is missing from the subject`)
  }
