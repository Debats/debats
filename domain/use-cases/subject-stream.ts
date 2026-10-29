import { Context, Effect } from 'effect'
import {
  findPosition,
  importPosition,
  importSubject,
  replaySubject,
  SUBJECT_STREAM,
  SubjectDecision,
  subjectLinked,
  SubjectState,
  subjectThemesSet,
} from '../aggregates/subject'
import { SubjectEvent, ThemeAssignmentPayload } from '../aggregates/subject-events'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { EventStore } from '../events/event-store'
import {
  AggregateStream,
  Decided,
  decideOn,
  IMPORT,
  RenderedFrom,
  requireState,
  Source,
} from './aggregate-stream'

/** What the tables hold of a subject, enough to import it into the journal */
export interface SubjectParts {
  subject: Subject
  positions: readonly Position[]
  themes: readonly ThemeAssignmentPayload[]
  relatedSubjectIds: readonly string[]
}

export type SubjectSource = Source<SubjectParts>
export const SubjectSource = Context.GenericTag<SubjectSource>('SubjectSource')

/**
 * A subject enters the journal event by event, each dated and signed as its
 * row: the subject, then each position, the themes, the links. Nobody is
 * recorded for a theme or a link in the tables: the subject's author stands in.
 */
export const subjectAggregate: AggregateStream<SubjectState, SubjectEvent, SubjectParts> = {
  streamType: SUBJECT_STREAM,
  notFound: 'Sujet introuvable.',
  source: SubjectSource,
  replay: replaySubject,
  isLive: (state) => state.deletedAt === null,
  importBatches: (parts) => {
    const author = parts.subject.createdBy ?? null
    return [
      {
        events: [importSubject(parts.subject)],
        options: { actorId: author, metadata: IMPORT, occurredAt: parts.subject.createdAt },
      },
      ...parts.positions.map((position) => ({
        events: [importPosition(position)],
        options: {
          actorId: position.createdBy ?? null,
          metadata: IMPORT,
          occurredAt: position.createdAt,
        },
      })),
      ...(parts.themes.length > 0
        ? [
            {
              events: [subjectThemesSet(parts.themes)],
              options: { actorId: author, metadata: IMPORT },
            },
          ]
        : []),
      ...parts.relatedSubjectIds.map((id) => ({
        events: [subjectLinked(id)],
        options: { actorId: author, metadata: IMPORT },
      })),
    ]
  },
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
