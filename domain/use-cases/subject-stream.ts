import { Effect, pipe } from 'effect'
import {
  importPosition,
  importSubject,
  linkSubject,
  replaySubject,
  setSubjectThemes,
  SubjectState,
  subjectStream,
} from '../aggregates/subject'
import { SubjectEvent, ThemeAssignmentPayload } from '../aggregates/subject-events'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import {
  AppendOptions,
  ConcurrencyError,
  EventStore,
  StoredEvent,
  StreamRef,
  streamRevision,
  UnreadableEvent,
} from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { Rejected } from './types'

/** What the tables hold of a subject, enough to import it into the journal */
export interface SubjectParts {
  subject: Subject
  positions: readonly Position[]
  themes: readonly ThemeAssignmentPayload[]
  relatedSubjectIds: readonly string[]
}

/** Reads a subject from the projections; null when there is none */
export type SubjectSource = (subjectId: string) => Effect.Effect<SubjectParts | null, DatabaseError>

const IMPORT = { source: 'import' }

/**
 * The stream of a subject. A subject written before its journal existed has
 * an empty stream: it enters the journal first, event by event, each dated
 * and signed as its row. Unknown everywhere: the command is refused.
 */
export function loadOrImportSubject(
  events: EventStore,
  subjectId: string,
  source: SubjectSource,
): Effect.Effect<StoredEvent[], DatabaseError | ConcurrencyError | Rejected> {
  const stream = subjectStream(subjectId)
  return Effect.flatMap(events.load(stream), (history) =>
    history.length > 0
      ? Effect.succeed(history)
      : Effect.flatMap(
          source(subjectId),
          (parts): Effect.Effect<StoredEvent[], DatabaseError | ConcurrencyError | Rejected> =>
            parts
              ? importParts(events, stream, parts)
              : Effect.fail(new Rejected('Sujet introuvable.')),
        ),
  )
}

interface Batch {
  events: SubjectEvent[]
  options: AppendOptions
}

function importParts(events: EventStore, stream: StreamRef, parts: SubjectParts) {
  const author = parts.subject.createdBy ?? null
  const batches: Batch[] = [
    {
      events: [importSubject(parts.subject)],
      options: {
        actorId: parts.subject.createdBy ?? null,
        metadata: IMPORT,
        occurredAt: parts.subject.createdAt,
      },
    },
    ...parts.positions.map((position) => ({
      events: [importPosition(position)],
      options: {
        actorId: position.createdBy ?? null,
        metadata: IMPORT,
        occurredAt: position.createdAt,
      },
    })),
    // Nobody is recorded for a theme or a link in the tables: the subject's author stands in
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
  return Effect.reduce(batches, [] as StoredEvent[], (history, batch) =>
    Effect.map(
      events.append(stream, streamRevision(history), batch.events, batch.options),
      (stored) => [...history, ...stored],
    ),
  )
}

/**
 * A command on a subject: loads its stream (importing it on demand), lets the
 * decision look at the current state, appends what it decided and rebuilds
 * what the subject now is. A decision refuses with a Rejected.
 */
export function decideOnSubject(
  events: EventStore,
  subjectId: string,
  source: SubjectSource,
  actorId: string,
  decide: (state: SubjectState) => Effect.Effect<SubjectEvent[], Rejected>,
): Effect.Effect<SubjectState, DatabaseError | ConcurrencyError | Rejected | UnreadableEvent> {
  const stream = subjectStream(subjectId)
  return pipe(
    loadOrImportSubject(events, subjectId, source),
    Effect.flatMap((history) =>
      pipe(
        replaySubject(history),
        Effect.flatMap(requireSubjectState),
        Effect.flatMap(decide),
        Effect.flatMap((decided) =>
          events.append(stream, streamRevision(history), decided, { actorId }),
        ),
        Effect.flatMap((stored) => replaySubject([...history, ...stored])),
        Effect.flatMap(requireSubjectState),
      ),
    ),
  )
}

export function requireSubjectState(state: SubjectState | null): Effect.Effect<SubjectState> {
  return state ? Effect.succeed(state) : Effect.dieMessage('The subject stream is empty')
}
