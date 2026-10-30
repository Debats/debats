import { Effect, Either, pipe } from 'effect'
import {
  replayStatement,
  STATEMENT_STREAM,
  StatementCascade,
  StatementDecision,
  StatementState,
} from '../aggregates/statement'
import { StatementEvent } from '../aggregates/statement-events'
import { EventStore, StoredEvent } from '../events/event-store'
import {
  AggregateStream,
  appendAndReplay,
  decideOn,
  loadStream,
  RenderedFrom,
  requireState as requireStateOf,
} from './aggregate-stream'

export const statementAggregate: AggregateStream<StatementState, StatementEvent> = {
  streamType: STATEMENT_STREAM,
  notFound: 'Prise de position introuvable.',
  replay: replayStatement,
  isLive: (state) => state.deletedAt === null,
}

export const loadStatement = (events: EventStore, statementId: string) =>
  loadStream(statementAggregate, events, statementId)

export const decideOnStatement = (
  events: EventStore,
  statementId: string,
  actorId: string,
  decide: StatementDecision,
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
 * The same cascade on each of several statements, each in its own stream:
 * what a command on another aggregate does to the statements it reaches.
 * One deleted meanwhile is skipped, not refused: a cascade has nothing to
 * say to what is gone.
 */
export function decideOnEachStatement(
  events: EventStore,
  statementIds: readonly string[],
  actorId: string,
  cascade: StatementCascade,
) {
  return Effect.forEach(
    statementIds,
    (id) =>
      pipe(
        decideOn(statementAggregate, events, id, actorId, (state) => Either.right(cascade(state))),
        Effect.catchTag('NotFound', () => Effect.void),
      ),
    { discard: true },
  )
}
