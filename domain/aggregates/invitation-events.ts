import * as S from 'effect/Schema'
import { eventDecoder } from '../events/decode-event'

/**
 * An invitation is a stream of its own: sent by a contributor (the actor of
 * the first event), accepted by the one who joins, or revoked when the
 * e-mail could not leave. Accepting it at its revision is what makes a
 * double acceptance impossible: the second one finds the stream moved.
 */

const Invitee = S.Struct({
  inviteeEmail: S.String,
  inviteeName: S.String,
})
export type InviteePayload = S.Schema.Type<typeof Invitee>

export const InvitationSent = S.Struct({
  type: S.Literal('InvitationSent'),
  payload: Invitee,
})

/** The invitee joined; the actor is the contributor she became */
export const InvitationAccepted = S.Struct({
  type: S.Literal('InvitationAccepted'),
  payload: S.Struct({ inviteeId: S.String }),
})

/** The e-mail could not be sent: the invitation never reached anyone */
export const InvitationRevoked = S.Struct({
  type: S.Literal('InvitationRevoked'),
  payload: S.Struct({}),
})

export const InvitationEvent = S.Union(InvitationSent, InvitationAccepted, InvitationRevoked)
export type InvitationEvent = S.Schema.Type<typeof InvitationEvent>

/** Reads a stored event as an invitation event, or says why the journal is corrupt */
export const decodeInvitationEvent = eventDecoder(InvitationEvent)
