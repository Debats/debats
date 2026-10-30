import { Effect, Either, pipe } from 'effect'
import {
  ConcurrencyError,
  DomainEvent,
  EventStore,
  Revision,
  StoredEvent,
  StreamRef,
  streamRevision,
  UniqueTaken,
  UnreadableEvent,
} from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { Decision, NotFound, Rejected } from '../aggregates/decision'

/** How one kind of aggregate lives in the journal: its stream and its rebuild */
export interface AggregateStream<State, Event extends DomainEvent> {
  streamType: string
  /** What the contributor reads when the journal does not know the aggregate */
  notFound: string
  replay: (events: StoredEvent[]) => Either.Either<State | null, UnreadableEvent>
  /** A deleted aggregate keeps its stream; a command on it is refused as on an unknown one */
  isLive: (state: State) => boolean
}

export type StreamFailure = DatabaseError | ConcurrencyError | UniqueTaken | Rejected | NotFound

const streamOf = (aggregate: { streamType: string }, id: string): StreamRef => ({
  streamType: aggregate.streamType,
  streamId: id,
})

/**
 * The stream of an aggregate, in the transaction. Every aggregate has one
 * since its creation opened it, or since the backfill of its table: an
 * empty stream is an aggregate nobody knows, and the command is refused.
 */
export function loadStream<State, Event extends DomainEvent>(
  aggregate: AggregateStream<State, Event>,
  events: EventStore,
  id: string,
): Effect.Effect<StoredEvent[], DatabaseError | NotFound> {
  return Effect.filterOrFail(
    events.load(streamOf(aggregate, id)),
    (history) => history.length > 0,
    () => new NotFound(aggregate.notFound),
  )
}

/**
 * What a write on a stream leaves: the aggregate as it now is, and the
 * revision its stream stands at, for a page that edits again to render from.
 */
export interface Decided<State> {
  state: State
  revision: Revision
}

/**
 * Appends the decision after the history, and rebuilds what the aggregate now
 * is. A decision that changes nothing writes nothing.
 */
export function appendAndReplay<State, Event extends DomainEvent>(
  aggregate: AggregateStream<State, Event>,
  events: EventStore,
  id: string,
  history: StoredEvent[],
  decided: Event[],
  actorId: string,
): Effect.Effect<Decided<State>, DatabaseError | ConcurrencyError | UniqueTaken | UnreadableEvent> {
  return pipe(
    decided.length > 0
      ? events.append(streamOf(aggregate, id), streamRevision(history), decided, { actorId })
      : Effect.succeed([]),
    Effect.map((stored) => [...history, ...stored]),
    Effect.flatMap((whole) =>
      pipe(
        aggregate.replay(whole),
        Effect.flatMap((state) => requireState(aggregate, state)),
        Effect.map((state) => ({ state, revision: streamRevision(whole) })),
      ),
    ),
  )
}

/**
 * Opens the stream of a new aggregate with its first events, and rebuilds
 * what it is. The command names the aggregate: the stream exists from its
 * first event, which a concurrent creation with the same id would refuse.
 */
export function openStream<State, Event extends DomainEvent>(
  aggregate: AggregateStream<State, Event>,
  events: EventStore,
  id: string,
  decided: Event[],
  actorId: string,
): Effect.Effect<Decided<State>, DatabaseError | ConcurrencyError | UniqueTaken | UnreadableEvent> {
  return appendAndReplay(aggregate, events, id, [], decided, actorId)
}

/**
 * The revision a form was rendered from, so that the command refuses to
 * overwrite what someone else wrote meanwhile. Undefined for a command that
 * comes from no form and decides from the current state. A revision given
 * is always compared: every aggregate has a stream, a page never renders
 * from an empty one.
 */
export type RenderedFrom = Revision | undefined

/**
 * A command on an aggregate: loads its stream, lets the aggregate's decision
 * look at the current state, appends what it decided and rebuilds what the
 * aggregate now is, at the revision it stands at. A decision refuses with a
 * Rejected; a deleted aggregate is NotFound before any decision; a stream
 * that moved past the revision the form was rendered from is a ConcurrencyError.
 */
export function decideOn<State, Event extends DomainEvent>(
  aggregate: AggregateStream<State, Event>,
  events: EventStore,
  id: string,
  actorId: string,
  decide: Decision<State, Event>,
  renderedFrom?: RenderedFrom,
): Effect.Effect<Decided<State>, StreamFailure | UnreadableEvent> {
  const stillAt = (history: StoredEvent[]) =>
    renderedFrom === undefined || streamRevision(history) === renderedFrom
  return pipe(
    loadStream(aggregate, events, id),
    Effect.filterOrFail(
      stillAt,
      () => new ConcurrencyError(streamOf(aggregate, id), renderedFrom!),
    ),
    Effect.flatMap((history) =>
      pipe(
        aggregate.replay(history),
        Effect.flatMap((state) => requireState(aggregate, state)),
        Effect.filterOrFail(aggregate.isLive, () => new NotFound(aggregate.notFound)),
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
