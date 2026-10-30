import { generateThemeSlug, Theme, ThemeId, ThemeName, ThemeSlug } from '../entities/theme'
import { StoredEvent, StreamRef } from '../events/event-store'
import { always, Decision } from './decision'
import { authored, authorOf, Decoded, replayStream } from './replay'
import { decodeThemeEvent, ThemeContent, ThemeEvent } from './theme-events'

export const THEME_STREAM = 'theme'

export const themeStream = (id: string): StreamRef => ({ streamType: THEME_STREAM, streamId: id })

/** What the journal says a theme is right now */
export interface ThemeState {
  theme: Theme
  deletedAt: Date | null
}

export interface ThemeInput {
  name: string
  description: string
}

/* Facts: what the stream records, named in the past tense as the events they are */

export const themeAdded = (input: ThemeInput): ThemeEvent => ({
  type: 'ThemeAdded',
  payload: {
    name: input.name,
    slug: generateThemeSlug(input.name),
    description: input.description,
  },
})

export const themeDeleted = (): ThemeEvent => ({ type: 'ThemeDeleted', payload: {} })

/* Decisions: what a command asks of the theme, decided from its state */

export type ThemeDecision = Decision<ThemeState, ThemeEvent>

/** An Idéaliste adds a theme; its id is the stream's, chosen by the command */
export const addTheme = (input: ThemeInput): ThemeEvent[] => [themeAdded(input)]

/** The subjects it gathered keep their other themes: the projection drops the links */
export const deleteTheme = (): ThemeDecision => always(themeDeleted())

/**
 * Rebuilds the theme from its stream; null for a stream without events.
 * A theme always has an author (the column is not null).
 */
export const replayTheme = replayStream(
  decodeThemeEvent,
  apply,
  authored(['ThemeAdded'], 'a theme'),
)

function apply(
  state: ThemeState | null,
  { event, stored }: Decoded<ThemeEvent>,
): ThemeState | null {
  switch (event.type) {
    case 'ThemeAdded':
      return { theme: themeFrom(stored, event.payload), deletedAt: null }
    case 'ThemeDeleted':
      return state && { ...state, deletedAt: stored.occurredAt }
  }
}

function themeFrom(stored: StoredEvent, payload: ThemeContent): Theme {
  return Theme.make({
    id: ThemeId.make(stored.streamId),
    name: ThemeName.make(payload.name),
    slug: ThemeSlug.make(payload.slug),
    description: payload.description,
    createdBy: authorOf(stored),
    updatedBy: authorOf(stored),
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
