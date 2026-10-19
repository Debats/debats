import { Effect, pipe } from 'effect'
import {
  importStatement,
  replayStatement,
  StatementState,
  statementStream,
} from '../aggregates/statement'
import { Statement } from '../entities/statement'
import { EventStore, StoredEvent, StreamRef, streamRevision } from '../events/event-store'
import { StatementEvent } from '../aggregates/statement-events'

/**
 * The stream of a statement that exists in the tables. A statement written
 * before its journal existed, or in the window of a deployment, has an empty
 * stream: it enters the journal first, as it is, dated and signed as it was.
 */
export function loadOrImportStatement(
  events: EventStore,
  existing: Statement,
  argumentIds: readonly string[],
) {
  const stream = statementStream(existing.id)
  return Effect.flatMap(events.load(stream), (history) =>
    history.length > 0
      ? Effect.succeed(history)
      : events.append(stream, 0, [importStatement(existing, argumentIds)], {
          actorId: existing.createdBy ?? null,
          metadata: { source: 'import' },
          occurredAt: existing.createdAt,
        }),
  )
}

/** Appends the decision after the history, and rebuilds what the statement now is */
export function appendToStatement(
  events: EventStore,
  stream: StreamRef,
  history: StoredEvent[],
  decided: StatementEvent[],
  actorId: string,
) {
  return pipe(
    events.append(stream, streamRevision(history), decided, { actorId }),
    Effect.flatMap((stored) => replayStatement([...history, ...stored])),
    Effect.flatMap(requireState),
  )
}

/** A stream that was just appended to cannot be empty */
export function requireState(state: StatementState | null): Effect.Effect<StatementState> {
  return state ? Effect.succeed(state) : Effect.dieMessage('The statement stream is empty')
}
