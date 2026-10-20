import * as S from 'effect/Schema'
import { Either } from 'effect'
import { StoredEvent, UnreadableEvent } from '../events/event-store'

/**
 * A theme is a stream of its own. Which subjects it gathers is in their
 * streams (`SubjectThemesSet`), never in this one.
 */

const ThemeContent = S.Struct({
  name: S.String,
  slug: S.String,
  description: S.String,
})
export type ThemeContent = S.Schema.Type<typeof ThemeContent>

export const ThemeAdded = S.Struct({
  type: S.Literal('ThemeAdded'),
  payload: ThemeContent,
})

/** The theme existed before the journal; this is the state it was found in */
export const ThemeImported = S.Struct({
  type: S.Literal('ThemeImported'),
  payload: ThemeContent,
})

/** The theme goes away; the subjects it gathered simply lose it */
export const ThemeDeleted = S.Struct({
  type: S.Literal('ThemeDeleted'),
  payload: S.Struct({}),
})

export const ThemeEvent = S.Union(ThemeAdded, ThemeImported, ThemeDeleted)
export type ThemeEvent = S.Schema.Type<typeof ThemeEvent>

const decode = S.decodeUnknownEither(ThemeEvent)

/** Reads a stored event as a theme event, or says why the journal is corrupt */
export function decodeThemeEvent(event: StoredEvent): Either.Either<ThemeEvent, UnreadableEvent> {
  return Either.mapLeft(
    decode({ type: event.type, payload: event.payload }),
    (error) => new UnreadableEvent(event, error.message),
  )
}
