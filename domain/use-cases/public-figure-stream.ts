import { Context, Effect } from 'effect'
import {
  findMembership,
  importMembership,
  importPublicFigure,
  PUBLIC_FIGURE_STREAM,
  PublicFigureState,
  replayPublicFigure,
  setOccupations,
} from '../aggregates/public-figure'
import { OccupationAssignmentPayload, PublicFigureEvent } from '../aggregates/public-figure-events'
import { OrganisationMembership } from '../entities/organisation-membership'
import { PublicFigure } from '../entities/public-figure'
import { EventStore } from '../events/event-store'
import { Rejected } from './types'
import {
  AggregateStream,
  Decided,
  decideOn,
  IMPORT,
  RenderedFrom,
  requireState,
  Source,
} from './aggregate-stream'

/** What the tables hold of a public figure, enough to import her into the journal */
export interface PublicFigureParts {
  figure: PublicFigure
  occupations: readonly OccupationAssignmentPayload[]
  memberships: readonly OrganisationMembership[]
}

export type PublicFigureSource = Source<PublicFigureParts>
export const PublicFigureSource = Context.GenericTag<PublicFigureSource>('PublicFigureSource')

/**
 * A figure enters the journal event by event, each dated and signed as its
 * row: the figure, then each affiliation, then the occupations. Nobody is
 * recorded for an occupation in the tables: the figure's author stands in.
 */
export const publicFigureAggregate: AggregateStream<
  PublicFigureState,
  PublicFigureEvent,
  PublicFigureParts
> = {
  streamType: PUBLIC_FIGURE_STREAM,
  notFound: 'Personnalité introuvable.',
  source: PublicFigureSource,
  replay: replayPublicFigure,
  isLive: (state) => state.deletedAt === null,
  importBatches: (parts) => [
    {
      events: [importPublicFigure(parts.figure)],
      options: {
        actorId: parts.figure.createdBy,
        metadata: IMPORT,
        occurredAt: parts.figure.createdAt,
      },
    },
    ...parts.memberships.map((membership) => ({
      events: [importMembership(membership)],
      options: {
        actorId: membership.createdBy,
        metadata: IMPORT,
        occurredAt: membership.createdAt,
      },
    })),
    ...(parts.occupations.length > 0
      ? [
          {
            events: [setOccupations(parts.occupations)],
            options: { actorId: parts.figure.createdBy, metadata: IMPORT },
          },
        ]
      : []),
  ],
}

export const decideOnPublicFigure = (
  events: EventStore,
  publicFigureId: string,
  actorId: string,
  decide: (state: PublicFigureState) => Effect.Effect<PublicFigureEvent[], Rejected>,
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
