import { Effect } from 'effect'
import {
  findMembership,
  PublicFigureDecision,
  PUBLIC_FIGURE_STREAM,
  PublicFigureState,
  replayPublicFigure,
} from '../aggregates/public-figure'
import { PublicFigureEvent } from '../aggregates/public-figure-events'
import { OrganisationMembership } from '../entities/organisation-membership'
import { EventStore } from '../events/event-store'
import { AggregateStream, Decided, decideOn, RenderedFrom, requireState } from './aggregate-stream'

export const publicFigureAggregate: AggregateStream<PublicFigureState, PublicFigureEvent> = {
  streamType: PUBLIC_FIGURE_STREAM,
  notFound: 'Personnalité introuvable.',
  replay: replayPublicFigure,
  isLive: (state) => state.deletedAt === null,
}

export const decideOnPublicFigure = (
  events: EventStore,
  publicFigureId: string,
  actorId: string,
  decide: PublicFigureDecision,
  renderedFrom?: RenderedFrom,
) => decideOn(publicFigureAggregate, events, publicFigureId, actorId, decide, renderedFrom)

export const requirePublicFigureState = (state: PublicFigureState | null) =>
  requireState(publicFigureAggregate, state)

/** The affiliation the decision just wrote: a figure without it has a broken replay */
export const writtenMembership =
  (membershipId: string) =>
  ({ state }: Decided<PublicFigureState>): Effect.Effect<OrganisationMembership> => {
    const membership = findMembership(state, membershipId)
    return membership
      ? Effect.succeed(membership)
      : Effect.dieMessage(`The membership ${membershipId} just written is missing from the figure`)
  }
