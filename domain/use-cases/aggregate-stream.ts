import { Effect, Either, pipe } from 'effect'
import {
  AppendOptions,
  ConcurrencyError,
  DomainEvent,
  EventStore,
  StoredEvent,
  streamRevision,
  UnreadableEvent,
} from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { Rejected } from './types'

/** Events to append together, dated and signed as the rows they come from */
export interface Batch<Event extends DomainEvent> {
  events: Event[]
  options: AppendOptions
}

/** How one kind of aggregate lives in the journal: its stream, its rebuild, its import */
export interface AggregateStream<State, Event extends DomainEvent, Parts> {
  streamType: string
  /** What the contributor reads when neither the journal nor the tables know the aggregate */
  notFound: string
  replay: (events: StoredEvent[]) => Either.Either<State | null, UnreadableEvent>
  /** The events that bring what the tables hold of the aggregate into its stream */
  importBatches: (parts: Parts) => Batch<Event>[]
}

/** Reads what the projections hold of an aggregate; null when there is none */
export type Source<Parts> = (id: string) => Effect.Effect<Parts | null, DatabaseError>

export type StreamFailure = DatabaseError | ConcurrencyError | Rejected

/**
 * The stream of an aggregate. One written before its journal existed, or in
 * the window of a deployment, has an empty stream: it enters the journal
 * first, as the tables hold it. Unknown everywhere: the command is refused.
 */
export function loadOrImport<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  events: EventStore,
  id: string,
  source: Source<Parts>,
): Effect.Effect<StoredEvent[], StreamFailure> {
  const stream = { streamType: aggregate.streamType, streamId: id }
  return Effect.flatMap(events.load(stream), (history) =>
    history.length > 0
      ? Effect.succeed(history)
      : Effect.flatMap(
          source(id),
          (parts): Effect.Effect<StoredEvent[], StreamFailure> =>
            parts
              ? Effect.reduce(
                  aggregate.importBatches(parts),
                  [] as StoredEvent[],
                  (imported, batch) =>
                    Effect.map(
                      events.append(stream, streamRevision(imported), batch.events, batch.options),
                      (stored) => [...imported, ...stored],
                    ),
                )
              : Effect.fail(new Rejected(aggregate.notFound)),
        ),
  )
}

/**
 * Appends the decision after the history, and rebuilds what the aggregate now
 * is. A decision that changes nothing writes nothing.
 */
export function appendAndReplay<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  events: EventStore,
  id: string,
  history: StoredEvent[],
  decided: Event[],
  actorId: string,
): Effect.Effect<State, DatabaseError | ConcurrencyError | UnreadableEvent> {
  const stream = { streamType: aggregate.streamType, streamId: id }
  return pipe(
    decided.length > 0
      ? events.append(stream, streamRevision(history), decided, { actorId })
      : Effect.succeed([]),
    Effect.flatMap((stored) => aggregate.replay([...history, ...stored])),
    Effect.flatMap((state) => requireState(aggregate, state)),
  )
}

/**
 * A command on an aggregate: loads its stream (importing it on demand), lets
 * the decision look at the current state, appends what it decided and
 * rebuilds what the aggregate now is. A decision refuses with a Rejected.
 */
export function decideOn<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  events: EventStore,
  id: string,
  source: Source<Parts>,
  actorId: string,
  decide: (state: State) => Effect.Effect<Event[], Rejected>,
): Effect.Effect<State, StreamFailure | UnreadableEvent> {
  return pipe(
    loadOrImport(aggregate, events, id, source),
    Effect.flatMap((history) =>
      pipe(
        aggregate.replay(history),
        Effect.flatMap((state) => requireState(aggregate, state)),
        Effect.flatMap(decide),
        Effect.flatMap((decided) =>
          appendAndReplay(aggregate, events, id, history, decided, actorId),
        ),
      ),
    ),
  )
}

/** A stream that was just loaded or appended to cannot be empty */
export function requireState<State>(
  aggregate: { streamType: string },
  state: State | null,
): Effect.Effect<State> {
  return state
    ? Effect.succeed(state)
    : Effect.dieMessage(`The ${aggregate.streamType} stream is empty`)
}
