import { Effect, Either, pipe } from 'effect'
import {
  AppendOptions,
  ConcurrencyError,
  DomainEvent,
  EventStore,
  StoredEvent,
  StreamRef,
  streamRevision,
  UniqueTaken,
  UnreadableEvent,
} from '../events/event-store'
import { RunUnitOfWork } from '../events/unit-of-work'
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
  /** A deleted aggregate keeps its stream; a command on it is refused as on an unknown one */
  isLive: (state: State) => boolean
  /** The events that bring what the tables hold of the aggregate into its stream */
  importBatches: (parts: Parts) => Batch<Event>[]
}

/** Metadata of an event imported on demand; the backfill migrations write `backfill` */
export const IMPORT = { source: 'import' }

/** Reads what the projections hold of an aggregate; null when there is none */
export type Source<Parts> = (id: string) => Effect.Effect<Parts | null, DatabaseError>

export type StreamFailure = DatabaseError | ConcurrencyError | UniqueTaken | Rejected

const streamOf = (aggregate: { streamType: string }, id: string): StreamRef => ({
  streamType: aggregate.streamType,
  streamId: id,
})

/**
 * Makes sure the aggregate has a stream, before the command's transaction.
 * One written before its journal existed, or in the window of a deployment,
 * has none: it enters the journal as the tables hold it, read outside any
 * transaction, in a unit of work of its own. Unknown everywhere: the command
 * is refused. Two commands importing it at once: the second finds it there.
 */
export function ensureStream<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  run: RunUnitOfWork,
  id: string,
  source: Source<Parts>,
): Effect.Effect<void, DatabaseError | UniqueTaken | Rejected> {
  const stream = streamOf(aggregate, id)
  const isMissing = run((events) => Effect.map(events.load(stream), (h) => h.length === 0))
  const imported = (parts: Parts) =>
    run((events) =>
      Effect.reduce(aggregate.importBatches(parts), 0, (revision, batch) =>
        Effect.map(
          events.append(stream, revision, batch.events, batch.options),
          (stored) => revision + stored.length,
        ),
      ),
    )
  const importFrom = (parts: Parts | null): Effect.Effect<void, StreamFailure> =>
    parts ? Effect.asVoid(imported(parts)) : Effect.fail(new Rejected(aggregate.notFound))
  return pipe(
    isMissing,
    Effect.flatMap(
      (missing): Effect.Effect<void, StreamFailure> =>
        missing ? Effect.flatMap(source(id), importFrom) : Effect.void,
    ),
    // Imported meanwhile by another command: the stream is there, which is all that matters
    Effect.catchTag('ConcurrencyError', () => Effect.void),
  )
}

/** The same, for every aggregate a command reaches */
export function ensureStreams<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  run: RunUnitOfWork,
  ids: readonly string[],
  source: Source<Parts>,
): Effect.Effect<void, DatabaseError | UniqueTaken | Rejected> {
  return Effect.forEach(ids, (id) => ensureStream(aggregate, run, id, source), { discard: true })
}

/** The stream of an aggregate, in the transaction; an aggregate nobody knows is refused */
export function loadStream<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  events: EventStore,
  id: string,
): Effect.Effect<StoredEvent[], DatabaseError | Rejected> {
  return Effect.filterOrFail(
    events.load(streamOf(aggregate, id)),
    (history) => history.length > 0,
    () => new Rejected(aggregate.notFound),
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
): Effect.Effect<State, DatabaseError | ConcurrencyError | UniqueTaken | UnreadableEvent> {
  return pipe(
    decided.length > 0
      ? events.append(streamOf(aggregate, id), streamRevision(history), decided, { actorId })
      : Effect.succeed([]),
    Effect.flatMap((stored) => aggregate.replay([...history, ...stored])),
    Effect.flatMap((state) => requireState(aggregate, state)),
  )
}

/**
 * Opens the stream of a new aggregate with its first events, and rebuilds
 * what it is. The command names the aggregate: the stream exists from its
 * first event, which a concurrent creation with the same id would refuse.
 */
export function openStream<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  events: EventStore,
  id: string,
  decided: Event[],
  actorId: string,
): Effect.Effect<State, DatabaseError | ConcurrencyError | UniqueTaken | UnreadableEvent> {
  return appendAndReplay(aggregate, events, id, [], decided, actorId)
}

/**
 * A command on an aggregate: loads its stream, lets the decision look at the
 * current state, appends what it decided and rebuilds what the aggregate now
 * is. A decision refuses with a Rejected; a deleted aggregate is refused
 * before any decision.
 */
export function decideOn<State, Event extends DomainEvent, Parts>(
  aggregate: AggregateStream<State, Event, Parts>,
  events: EventStore,
  id: string,
  actorId: string,
  decide: (state: State) => Effect.Effect<Event[], Rejected>,
): Effect.Effect<State, StreamFailure | UnreadableEvent> {
  return pipe(
    loadStream(aggregate, events, id),
    Effect.flatMap((history) =>
      pipe(
        aggregate.replay(history),
        Effect.flatMap((state) => requireState(aggregate, state)),
        Effect.filterOrFail(aggregate.isLive, () => new Rejected(aggregate.notFound)),
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
