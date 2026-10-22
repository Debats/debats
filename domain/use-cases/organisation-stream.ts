import { Effect } from 'effect'
import {
  importOrganisation,
  ORGANISATION_STREAM,
  OrganisationState,
  replayOrganisation,
} from '../aggregates/organisation'
import { OrganisationEvent } from '../aggregates/organisation-events'
import { Organisation } from '../entities/organisation'
import { EventStore } from '../events/event-store'
import { Rejected } from './types'
import { AggregateStream, decideOn, IMPORT, requireState, Source } from './aggregate-stream'

/** What the tables hold of an organisation, enough to import it into the journal */
export interface OrganisationParts {
  organisation: Organisation
}

export type OrganisationSource = Source<OrganisationParts>

export const organisationAggregate: AggregateStream<
  OrganisationState,
  OrganisationEvent,
  OrganisationParts
> = {
  streamType: ORGANISATION_STREAM,
  notFound: 'Organisation introuvable.',
  replay: replayOrganisation,
  isLive: (state) => state.deletedAt === null,
  importBatches: ({ organisation }) => [
    {
      events: [importOrganisation(organisation)],
      options: {
        actorId: organisation.createdBy,
        metadata: IMPORT,
        occurredAt: organisation.createdAt,
      },
    },
  ],
}

export const decideOnOrganisation = (
  events: EventStore,
  organisationId: string,
  source: OrganisationSource,
  actorId: string,
  decide: (state: OrganisationState) => Effect.Effect<OrganisationEvent[], Rejected>,
) => decideOn(organisationAggregate, events, organisationId, source, actorId, decide)

export const requireOrganisationState = (state: OrganisationState | null) =>
  requireState(organisationAggregate, state)
