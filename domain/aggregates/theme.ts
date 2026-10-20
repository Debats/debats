import { Either, pipe } from 'effect'
import { generateThemeSlug, Theme, ThemeId, ThemeName, ThemeSlug } from '../entities/theme'
import { StoredEvent, StreamRef, UnreadableEvent } from '../events/event-store'
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

/** Decision: a contributor adds a theme (its id is chosen by the caller, as the stream's) */
export const addTheme = (input: ThemeInput): ThemeEvent => ({
  type: 'ThemeAdded',
  payload: {
    name: input.name,
    slug: generateThemeSlug(input.name),
    description: input.description,
  },
})

export const deleteTheme = (): ThemeEvent => ({ type: 'ThemeDeleted', payload: {} })

/** A theme found in the table before its journal existed enters it as it is */
export const importTheme = (theme: Theme): ThemeEvent => ({
  type: 'ThemeImported',
  payload: { name: theme.name, slug: theme.slug, description: theme.description },
})

/** Rebuilds the theme from its stream; null for a stream without events */
export function replayTheme(
  events: StoredEvent[],
): Either.Either<ThemeState | null, UnreadableEvent> {
  return Either.map(
    Either.all(
      events.map((stored) =>
        pipe(
          decodeThemeEvent(stored),
          Either.flatMap((event) => requireAuthorOfCreation(stored, event)),
          Either.map(withMeta(stored)),
        ),
      ),
    ),
    (decoded) => decoded.reduce(apply, null),
  )
}

/** A theme always has an author (the column is not null): a creation without one is corrupt */
function requireAuthorOfCreation(
  stored: StoredEvent,
  event: ThemeEvent,
): Either.Either<ThemeEvent, UnreadableEvent> {
  const creation = event.type === 'ThemeAdded' || event.type === 'ThemeImported'
  return creation && !stored.actorId
    ? Either.left(new UnreadableEvent(stored, 'a theme needs an author'))
    : Either.right(event)
}

interface DecodedEvent {
  event: ThemeEvent
  stored: StoredEvent
}

const withMeta = (stored: StoredEvent) => (event: ThemeEvent) => ({ event, stored })

function apply(state: ThemeState | null, { event, stored }: DecodedEvent): ThemeState | null {
  switch (event.type) {
    case 'ThemeAdded':
    case 'ThemeImported':
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
    // Checked by requireAuthorOfCreation before any event is applied
    createdBy: stored.actorId!,
    updatedBy: stored.actorId!,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
