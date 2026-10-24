import { Either, pipe } from 'effect'
import { DomainEvent, StoredEvent, UnreadableEvent } from '../events/event-store'

/** An event as the domain reads it, with the envelope the journal stored it in */
export interface Decoded<Event> {
  event: Event
  stored: StoredEvent
}

/** Whether a decoded event may be applied; a refusal says why the journal is corrupt */
export type Check<Event> = (
  decoded: Decoded<Event>,
) => Either.Either<Decoded<Event>, UnreadableEvent>

/**
 * Rebuilds an aggregate from its stream: each event decoded and checked,
 * then folded in order from nothing. Null for a stream without events.
 */
export function replayStream<Event extends DomainEvent, State>(
  decode: (stored: StoredEvent) => Either.Either<Event, UnreadableEvent>,
  apply: (state: State | null, decoded: Decoded<Event>) => State | null,
  check: Check<Event> = Either.right,
): (events: StoredEvent[]) => Either.Either<State | null, UnreadableEvent> {
  return (events) =>
    Either.map(
      Either.all(
        events.map((stored) =>
          pipe(
            decode(stored),
            Either.map((event) => ({ event, stored })),
            Either.flatMap(check),
          ),
        ),
      ),
      (decoded) => decoded.reduce(apply, null),
    )
}

/**
 * The events that create a row whose author column is not null: one without
 * an actor is corrupt, as the projector would say.
 */
export function authored<Event extends DomainEvent>(
  creations: readonly Event['type'][],
  what: string,
): Check<Event> {
  const types: ReadonlySet<string> = new Set(creations)
  return (decoded) =>
    types.has(decoded.event.type) && !decoded.stored.actorId
      ? Either.left(new UnreadableEvent(decoded.stored, `${what} needs an author`))
      : Either.right(decoded)
}
