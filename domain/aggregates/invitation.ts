import { Either } from 'effect'
import { Invitation, InvitationId, InviteeEmail, InviteeName } from '../entities/invitation'
import { StoredEvent, StreamRef } from '../events/event-store'
import { always, Decision, refused } from './decision'
import { decodeInvitationEvent, InvitationEvent, InviteePayload } from './invitation-events'
import { authored, authorOf, Decoded, replayStream } from './replay'

export const INVITATION_STREAM = 'invitation'

export const invitationStream = (id: string): StreamRef => ({
  streamType: INVITATION_STREAM,
  streamId: id,
})

/** What the journal says an invitation is right now */
export interface InvitationState {
  invitation: Invitation
  /** When the e-mail failed and the invitation was withdrawn; the row is gone since */
  revokedAt: Date | null
}

export const isPendingInvitation = (state: InvitationState): boolean =>
  state.invitation.status === 'pending'

/* Facts: what the stream records, named in the past tense as the events they are */

export const invitationSent = (invitee: InviteePayload): InvitationEvent => ({
  type: 'InvitationSent',
  payload: invitee,
})

export const invitationAccepted = (inviteeId: string): InvitationEvent => ({
  type: 'InvitationAccepted',
  payload: { inviteeId },
})

export const invitationRevoked = (): InvitationEvent => ({
  type: 'InvitationRevoked',
  payload: {},
})

/* Decisions: what a command asks of the invitation, decided from its state */

export type InvitationDecision = Decision<InvitationState, InvitationEvent>

export const ALREADY_ACCEPTED = 'Cette invitation a déjà été acceptée.'

/** A contributor invites someone; the id is the stream's, chosen by the command */
export const sendInvitation = (invitee: InviteePayload): InvitationEvent[] => [
  invitationSent(invitee),
]

/** The invitee joins as this contributor; an invitation accepted once stays accepted */
export const acceptInvitation =
  (inviteeId: string): InvitationDecision =>
  (state) =>
    isPendingInvitation(state)
      ? Either.right([invitationAccepted(inviteeId)])
      : refused(ALREADY_ACCEPTED)

/** The e-mail could not leave: the invitation is withdrawn */
export const revokeInvitation = (): InvitationDecision => always(invitationRevoked())

/**
 * Rebuilds the invitation from its stream; null for a stream without events.
 * An invitation always has an inviter (the column is not null).
 */
export const replayInvitation = replayStream(
  decodeInvitationEvent,
  apply,
  authored(['InvitationSent'], 'an invitation'),
)

function apply(
  state: InvitationState | null,
  { event, stored }: Decoded<InvitationEvent>,
): InvitationState | null {
  switch (event.type) {
    case 'InvitationSent':
      return { invitation: invitationFrom(stored, event.payload), revokedAt: null }
  }
  if (!state) return null
  switch (event.type) {
    case 'InvitationAccepted':
      return {
        ...state,
        invitation: {
          ...state.invitation,
          status: 'accepted',
          inviteeId: event.payload.inviteeId,
          updatedAt: stored.occurredAt,
        },
      }
    case 'InvitationRevoked':
      return { ...state, revokedAt: stored.occurredAt }
  }
}

function invitationFrom(stored: StoredEvent, payload: InviteePayload): Invitation {
  return Invitation.make({
    id: InvitationId.make(stored.streamId),
    inviterId: authorOf(stored),
    inviteeEmail: InviteeEmail.make(payload.inviteeEmail),
    inviteeName: InviteeName.make(payload.inviteeName),
    status: 'pending',
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
