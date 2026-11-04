import {
  INVITATION_STREAM,
  InvitationDecision,
  InvitationState,
  replayInvitation,
} from '../aggregates/invitation'
import { InvitationEvent } from '../aggregates/invitation-events'
import { EventStore, Revision } from '../events/event-store'
import { AggregateStream, decideOn, requireState } from './aggregate-stream'

export const invitationAggregate: AggregateStream<InvitationState, InvitationEvent> = {
  streamType: INVITATION_STREAM,
  notFound: 'Invitation introuvable.',
  replay: replayInvitation,
  isLive: (state) => state.revokedAt === null,
}

export const decideOnInvitation = (
  events: EventStore,
  invitationId: string,
  actorId: string,
  decide: InvitationDecision,
  renderedFrom?: Revision,
) => decideOn(invitationAggregate, events, invitationId, actorId, decide, renderedFrom)

export const requireInvitationState = (state: InvitationState | null) =>
  requireState(invitationAggregate, state)
