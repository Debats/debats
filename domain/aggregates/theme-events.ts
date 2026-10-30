import * as S from 'effect/Schema'
import { eventDecoder } from '../events/decode-event'

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

/** The theme goes away; the subjects it gathered simply lose it */
export const ThemeDeleted = S.Struct({
  type: S.Literal('ThemeDeleted'),
  payload: S.Struct({}),
})

export const ThemeEvent = S.Union(ThemeAdded, ThemeDeleted)
export type ThemeEvent = S.Schema.Type<typeof ThemeEvent>

/** Reads a stored event as a theme event, or says why the journal is corrupt */
export const decodeThemeEvent = eventDecoder(ThemeEvent)
