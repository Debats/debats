import { Effect, pipe } from 'effect'
import {
  importStatement,
  replayStatement,
  StatementState,
  statementStream,
} from '../aggregates/statement'
import { StatementEvent } from '../aggregates/statement-events'
import { Statement } from '../entities/statement'
import { ConcurrencyError, EventStore, StoredEvent, streamRevision } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { Rejected } from './types'

/** What the tables hold of a statement, enough to import it into the journal */
export interface StatementParts {
  statement: Statement
  argumentIds: readonly string[]
}

/** Reads a statement from the projection; null when there is none */
export type StatementSource = (
  statementId: string,
) => Effect.Effect<StatementParts | null, DatabaseError>

/**
 * The stream of a statement. A statement written before its journal existed,
 * or in the window of a deployment, has an empty stream: it enters the
 * journal first, as it is, dated and signed as its row. Unknown everywhere:
 * the command is refused.
 */
export function loadOrImportStatement(
  events: EventStore,
  statementId: string,
  source: StatementSource,
): Effect.Effect<StoredEvent[], DatabaseError | ConcurrencyError | Rejected> {
  const stream = statementStream(statementId)
  return Effect.flatMap(events.load(stream), (history) =>
    history.length > 0
      ? Effect.succeed(history)
      : Effect.flatMap(
          source(statementId),
          (parts): Effect.Effect<StoredEvent[], DatabaseError | ConcurrencyError | Rejected> =>
            parts
              ? events.append(stream, 0, [importStatement(parts.statement, parts.argumentIds)], {
                  actorId: parts.statement.createdBy ?? null,
                  metadata: { source: 'import' },
                  occurredAt: parts.statement.createdAt,
                })
              : Effect.fail(new Rejected('Prise de position introuvable.')),
        ),
  )
}

/** Appends the decision after the history, and rebuilds what the statement now is */
export function appendToStatement(
  events: EventStore,
  statementId: string,
  history: StoredEvent[],
  decided: StatementEvent[],
  actorId: string,
) {
  return pipe(
    events.append(statementStream(statementId), streamRevision(history), decided, { actorId }),
    Effect.flatMap((stored) => replayStatement([...history, ...stored])),
    Effect.flatMap(requireState),
  )
}

/**
 * The same decision on each of several statements, each in its own stream:
 * what a command on another aggregate does to the statements it reaches.
 */
export function decideOnEachStatement(
  events: EventStore,
  statementIds: readonly string[],
  source: StatementSource,
  actorId: string,
  decided: StatementEvent,
) {
  return Effect.forEach(
    statementIds,
    (id) =>
      Effect.flatMap(loadOrImportStatement(events, id, source), (history) =>
        appendToStatement(events, id, history, [decided], actorId),
      ),
    { discard: true },
  )
}

/** A stream that was just appended to cannot be empty */
export function requireState(state: StatementState | null): Effect.Effect<StatementState> {
  return state ? Effect.succeed(state) : Effect.dieMessage('The statement stream is empty')
}
