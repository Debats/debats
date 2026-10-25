import { Effect, pipe } from 'effect'
import {
  importStatement,
  replayStatement,
  STATEMENT_STREAM,
  StatementState,
} from '../aggregates/statement'
import { StatementEvent } from '../aggregates/statement-events'
import { Statement } from '../entities/statement'
import { EventStore, StoredEvent, UnreadableEvent } from '../events/event-store'
import { Rejected } from './types'
import {
  AggregateStream,
  appendAndReplay,
  decideOn,
  IMPORT,
  loadStream,
  RenderedFrom,
  requireState as requireStateOf,
  Source,
  StreamFailure,
} from './aggregate-stream'

/** What the tables hold of a statement, enough to import it into the journal */
export interface StatementParts {
  statement: Statement
  argumentIds: readonly string[]
  /** The subject of its position: the stream names it from its first event */
  subjectId: string
}

export type StatementSource = Source<StatementParts>

export const statementAggregate: AggregateStream<StatementState, StatementEvent, StatementParts> = {
  streamType: STATEMENT_STREAM,
  notFound: 'Prise de position introuvable.',
  replay: replayStatement,
  isLive: (state) => state.deletedAt === null,
  importBatches: ({ statement, argumentIds, subjectId }) => [
    {
      events: [importStatement(statement, argumentIds, subjectId)],
      options: {
        actorId: statement.createdBy ?? null,
        metadata: IMPORT,
        occurredAt: statement.createdAt,
      },
    },
  ],
}

export const loadStatement = (events: EventStore, statementId: string) =>
  loadStream(statementAggregate, events, statementId)

export const decideOnStatement = (
  events: EventStore,
  statementId: string,
  actorId: string,
  decide: (state: StatementState) => Effect.Effect<StatementEvent[], Rejected>,
  renderedFrom?: RenderedFrom,
) => decideOn(statementAggregate, events, statementId, actorId, decide, renderedFrom)

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
 * Their streams were ensured before the transaction. One deleted meanwhile
 * is skipped, not refused: a cascade has nothing to say to what is gone.
 */
export function decideOnEachStatement(
  events: EventStore,
  statementIds: readonly string[],
  actorId: string,
  decide: (state: StatementState) => StatementEvent[],
) {
  const gone = (failure: StreamFailure | UnreadableEvent) =>
    failure._tag === 'Rejected' && failure.message === statementAggregate.notFound
  return Effect.forEach(
    statementIds,
    (id) =>
      pipe(
        decideOn(statementAggregate, events, id, actorId, (state) => Effect.succeed(decide(state))),
        Effect.catchIf(gone, () => Effect.void),
      ),
    { discard: true },
  )
}
