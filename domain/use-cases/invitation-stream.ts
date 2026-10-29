import { Context } from 'effect'
import {
  importInvitation,
  INVITATION_STREAM,
  invitationAccepted,
  InvitationDecision,
  InvitationState,
  replayInvitation,
} from '../aggregates/invitation'
import { InvitationEvent } from '../aggregates/invitation-events'
import { Invitation } from '../entities/invitation'
import { EventStore } from '../events/event-store'
import {
  AggregateStream,
  Batch,
  decideOn,
  IMPORT,
  RenderedFrom,
  requireState,
  Source,
} from './aggregate-stream'

/** What the table holds of an invitation, enough to import it into the journal */
export interface InvitationParts {
  invitation: Invitation
}

export type InvitationSource = Source<InvitationParts>
export const InvitationSource = Context.GenericTag<InvitationSource>('InvitationSource')

/** An invitation enters the journal as sent, then as accepted if it was */
export const invitationAggregate: AggregateStream<
  InvitationState,
  InvitationEvent,
  InvitationParts
> = {
  streamType: INVITATION_STREAM,
  notFound: 'Invitation introuvable.',
  source: InvitationSource,
  replay: replayInvitation,
  isLive: (state) => state.revokedAt === null,
  importBatches: ({ invitation }) => [
    {
      events: [importInvitation(invitation)],
      options: {
        actorId: invitation.inviterId,
        metadata: IMPORT,
        occurredAt: invitation.createdAt,
      },
    },
    ...(invitation.status === 'accepted' && invitation.inviteeId
      ? [
          {
            events: [invitationAccepted(invitation.inviteeId)],
            options: {
              actorId: invitation.inviteeId,
              metadata: IMPORT,
              occurredAt: invitation.updatedAt,
            },
          } satisfies Batch<InvitationEvent>,
        ]
      : []),
  ],
}

export const decideOnInvitation = (
  events: EventStore,
  invitationId: string,
  actorId: string,
  decide: InvitationDecision,
  renderedFrom?: RenderedFrom,
) => decideOn(invitationAggregate, events, invitationId, actorId, decide, renderedFrom)

export const requireInvitationState = (state: InvitationState | null) =>
  requireState(invitationAggregate, state)
