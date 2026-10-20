import * as S from 'effect/Schema'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'

/**
 * An argument is a stream of its own: a global tag whose wording changes and
 * which can be folded into another one. Which statements mobilise it is in
 * their streams, never in this one.
 */

const ArgumentWording = S.Struct({
  title: S.String,
  slug: S.String,
  description: S.String,
})
export type ArgumentWording = S.Schema.Type<typeof ArgumentWording>

export const ArgumentAdded = S.Struct({
  type: S.Literal('ArgumentAdded'),
  payload: ArgumentWording,
})

/** The argument existed before the journal; this is the state it was found in */
export const ArgumentImported = S.Struct({
  type: S.Literal('ArgumentImported'),
  payload: ArgumentWording,
})

export const ArgumentRenamed = S.Struct({
  type: S.Literal('ArgumentRenamed'),
  payload: ArgumentWording,
})

/** A duplicate folded into the argument that remains; its statements now mobilise that one */
export const ArgumentMergedInto = S.Struct({
  type: S.Literal('ArgumentMergedInto'),
  payload: S.Struct({ targetArgumentId: S.String }),
})

export const ArgumentDeleted = S.Struct({
  type: S.Literal('ArgumentDeleted'),
  payload: S.Struct({}),
})

export const ArgumentEvent = S.Union(
  ArgumentAdded,
  ArgumentImported,
  ArgumentRenamed,
  ArgumentMergedInto,
  ArgumentDeleted,
)
export type ArgumentEvent = S.Schema.Type<typeof ArgumentEvent>

const decode = S.decodeUnknownEither(ArgumentEvent)

/** Reads a stored event as an argument event, or says why the journal is corrupt */
export function decodeArgumentEvent(
  event: StoredEvent,
): Either.Either<ArgumentEvent, UnreadableEvent> {
  return Either.mapLeft(
    decode({ type: event.type, payload: event.payload }),
    (error) => new UnreadableEvent(event, error.message),
  )
}
