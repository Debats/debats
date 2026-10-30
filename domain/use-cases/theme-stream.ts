import { replayTheme, THEME_STREAM, ThemeDecision, ThemeState } from '../aggregates/theme'
import { ThemeEvent } from '../aggregates/theme-events'
import { EventStore } from '../events/event-store'
import { AggregateStream, decideOn, requireState } from './aggregate-stream'

export const themeAggregate: AggregateStream<ThemeState, ThemeEvent> = {
  streamType: THEME_STREAM,
  notFound: 'La thématique est introuvable.',
  replay: replayTheme,
  isLive: (state) => state.deletedAt === null,
}

export const decideOnTheme = (
  events: EventStore,
  themeId: string,
  actorId: string,
  decide: ThemeDecision,
) => decideOn(themeAggregate, events, themeId, actorId, decide)

export const requireThemeState = (state: ThemeState | null) => requireState(themeAggregate, state)
