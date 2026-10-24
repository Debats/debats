import * as S from 'effect/Schema'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from './event-store'

/**
 * The decoder of one stream type: reads a stored event with the union schema
 * of the stream's events, or says why the journal is corrupt. A payload whose
 * shape changed is read by the schema (the union of its forms), never by
 * rewriting the journal.
 */
export function eventDecoder<Event, Encoded>(
  schema: S.Schema<Event, Encoded, never>,
): (event: StoredEvent) => Either.Either<Event, UnreadableEvent> {
  const decode = S.decodeUnknownEither(schema)
  return (event) =>
    Either.mapLeft(
      decode({ type: event.type, payload: event.payload }),
      (error) => new UnreadableEvent(event, error.message),
    )
}
