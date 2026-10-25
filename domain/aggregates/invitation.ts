import { Invitation, InvitationId, InviteeEmail, InviteeName } from '../entities/invitation'
import { StoredEvent, StreamRef } from '../events/event-store'
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

/** Decision: a contributor invites someone (the id is chosen by the caller, as the stream's) */
export const sendInvitation = (invitee: InviteePayload): InvitationEvent => ({
  type: 'InvitationSent',
  payload: invitee,
})

/** Decision: the invitee joined as this contributor */
export const acceptInvitation = (inviteeId: string): InvitationEvent => ({
  type: 'InvitationAccepted',
  payload: { inviteeId },
})

/** Decision: the e-mail could not leave, the invitation is withdrawn */
export const revokeInvitation = (): InvitationEvent => ({
  type: 'InvitationRevoked',
  payload: {},
})

/** An invitation found in the table before its journal existed enters it as it was sent */
export const importInvitation = (invitation: Invitation): InvitationEvent => ({
  type: 'InvitationImported',
  payload: { inviteeEmail: invitation.inviteeEmail, inviteeName: invitation.inviteeName },
})

/**
 * Rebuilds the invitation from its stream; null for a stream without events.
 * An invitation always has an inviter (the column is not null).
 */
export const replayInvitation = replayStream(
  decodeInvitationEvent,
  apply,
  authored(['InvitationSent', 'InvitationImported'], 'an invitation'),
)

function apply(
  state: InvitationState | null,
  { event, stored }: Decoded<InvitationEvent>,
): InvitationState | null {
  switch (event.type) {
    case 'InvitationSent':
    case 'InvitationImported':
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
