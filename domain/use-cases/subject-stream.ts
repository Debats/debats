import { Effect } from 'effect'
import {
  importPosition,
  importSubject,
  linkSubject,
  replaySubject,
  setSubjectThemes,
  SUBJECT_STREAM,
  SubjectState,
} from '../aggregates/subject'
import { SubjectEvent, ThemeAssignmentPayload } from '../aggregates/subject-events'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { EventStore } from '../events/event-store'
import { Rejected } from './types'
import { AggregateStream, decideOn, loadOrImport, requireState, Source } from './aggregate-stream'

/** What the tables hold of a subject, enough to import it into the journal */
export interface SubjectParts {
  subject: Subject
  positions: readonly Position[]
  themes: readonly ThemeAssignmentPayload[]
  relatedSubjectIds: readonly string[]
}

export type SubjectSource = Source<SubjectParts>

const IMPORT = { source: 'import' }

/**
 * A subject enters the journal event by event, each dated and signed as its
 * row: the subject, then each position, the themes, the links. Nobody is
 * recorded for a theme or a link in the tables: the subject's author stands in.
 */
export const subjectAggregate: AggregateStream<SubjectState, SubjectEvent, SubjectParts> = {
  streamType: SUBJECT_STREAM,
  notFound: 'Sujet introuvable.',
  replay: replaySubject,
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
              events: [setSubjectThemes(parts.themes)],
              options: { actorId: author, metadata: IMPORT },
            },
          ]
        : []),
      ...parts.relatedSubjectIds.map((id) => ({
        events: [linkSubject(id)],
        options: { actorId: author, metadata: IMPORT },
      })),
    ]
  },
}

export const loadOrImportSubject = (events: EventStore, subjectId: string, source: SubjectSource) =>
  loadOrImport(subjectAggregate, events, subjectId, source)

export const decideOnSubject = (
  events: EventStore,
  subjectId: string,
  source: SubjectSource,
  actorId: string,
  decide: (state: SubjectState) => Effect.Effect<SubjectEvent[], Rejected>,
) => decideOn(subjectAggregate, events, subjectId, source, actorId, decide)

export const requireSubjectState = (state: SubjectState | null) =>
  requireState(subjectAggregate, state)
