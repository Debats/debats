import { Effect } from 'effect'
import { importTheme, replayTheme, THEME_STREAM, ThemeState } from '../aggregates/theme'
import { ThemeEvent } from '../aggregates/theme-events'
import { Theme } from '../entities/theme'
import { EventStore } from '../events/event-store'
import { Rejected } from './types'
import { AggregateStream, decideOn, IMPORT, requireState, Source } from './aggregate-stream'

/** What the table holds of a theme, enough to import it into the journal */
export interface ThemeParts {
  theme: Theme
}

export type ThemeSource = Source<ThemeParts>

export const themeAggregate: AggregateStream<ThemeState, ThemeEvent, ThemeParts> = {
  streamType: THEME_STREAM,
  notFound: 'La thématique est introuvable.',
  replay: replayTheme,
  isLive: (state) => state.deletedAt === null,
  importBatches: ({ theme }) => [
    {
      events: [importTheme(theme)],
      options: {
        actorId: theme.createdBy,
        metadata: IMPORT,
        occurredAt: theme.createdAt,
      },
    },
  ],
}

export const decideOnTheme = (
  events: EventStore,
  themeId: string,
  actorId: string,
  decide: (state: ThemeState) => Effect.Effect<ThemeEvent[], Rejected>,
) => decideOn(themeAggregate, events, themeId, actorId, decide)

export const requireThemeState = (state: ThemeState | null) => requireState(themeAggregate, state)
