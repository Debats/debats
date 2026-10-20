import { Effect } from 'effect'
import {
  importStatement,
  replayStatement,
  STATEMENT_STREAM,
  StatementState,
} from '../aggregates/statement'
import { StatementEvent } from '../aggregates/statement-events'
import { Statement } from '../entities/statement'
import { EventStore, StoredEvent } from '../events/event-store'
import {
  AggregateStream,
  appendAndReplay,
  decideOn,
  loadOrImport,
  requireState as requireStateOf,
  Source,
} from './aggregate-stream'

/** What the tables hold of a statement, enough to import it into the journal */
export interface StatementParts {
  statement: Statement
  argumentIds: readonly string[]
}

export type StatementSource = Source<StatementParts>

export const statementAggregate: AggregateStream<StatementState, StatementEvent, StatementParts> = {
  streamType: STATEMENT_STREAM,
  notFound: 'Prise de position introuvable.',
  replay: replayStatement,
  importBatches: ({ statement, argumentIds }) => [
    {
      events: [importStatement(statement, argumentIds)],
      options: {
        actorId: statement.createdBy ?? null,
        metadata: { source: 'import' },
        occurredAt: statement.createdAt,
      },
    },
  ],
}

export const loadOrImportStatement = (
  events: EventStore,
  statementId: string,
  source: StatementSource,
) => loadOrImport(statementAggregate, events, statementId, source)

export const appendToStatement = (
  events: EventStore,
  statementId: string,
  history: StoredEvent[],
  decided: StatementEvent[],
  actorId: string,
) => appendAndReplay(statementAggregate, events, statementId, history, decided, actorId)

export const requireState = (state: StatementState | null) =>
  requireStateOf(statementAggregate, state)

/**
 * The same decision on each of several statements, each in its own stream:
 * what a command on another aggregate does to the statements it reaches.
 */
export function decideOnEachStatement(
  events: EventStore,
  statementIds: readonly string[],
  source: StatementSource,
  actorId: string,
  decide: (state: StatementState) => StatementEvent[],
) {
  return Effect.forEach(
    statementIds,
    (id) =>
      decideOn(statementAggregate, events, id, source, actorId, (state) =>
        Effect.succeed(decide(state)),
      ),
    { discard: true },
  )
}
