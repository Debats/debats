import {
  OrganisationDecision,
  ORGANISATION_STREAM,
  OrganisationState,
  replayOrganisation,
} from '../aggregates/organisation'
import { OrganisationEvent } from '../aggregates/organisation-events'
import { EventStore, Revision } from '../events/event-store'
import { AggregateStream, decideOn, requireState } from './aggregate-stream'

export const organisationAggregate: AggregateStream<OrganisationState, OrganisationEvent> = {
  streamType: ORGANISATION_STREAM,
  notFound: 'Organisation introuvable.',
  replay: replayOrganisation,
  isLive: (state) => state.deletedAt === null,
}

export const decideOnOrganisation = (
  events: EventStore,
  organisationId: string,
  actorId: string,
  decide: OrganisationDecision,
  renderedFrom?: Revision,
) => decideOn(organisationAggregate, events, organisationId, actorId, decide, renderedFrom)

export const requireOrganisationState = (state: OrganisationState | null) =>
  requireState(organisationAggregate, state)
