import {
  decodeInvitationEvent,
  InvitationEvent,
  InviteePayload,
} from '../../domain/aggregates/invitation-events'
import { StoredEvent } from '../../domain/events/event-store'
import { PrismaTransaction } from '../prisma/client'
import { actorOf, projectorOf } from './projector'

/**
 * Keeps the invitations table in step with the invitation stream. A revoked
 * invitation leaves the table.
 */
export const projectInvitation = projectorOf('invitation', decodeInvitationEvent, apply)

async function apply(decoded: InvitationEvent, stored: StoredEvent, tx: PrismaTransaction) {
  const id = stored.streamId
  switch (decoded.type) {
    case 'InvitationSent':
      return create(tx, stored, decoded.payload)
    case 'InvitationAccepted':
      await tx.invitations.update({
        where: { id },
        data: {
          status: 'accepted',
          invitee_id: decoded.payload.inviteeId,
          updated_at: stored.occurredAt,
        },
      })
      return
    case 'InvitationRevoked':
      await tx.invitations.deleteMany({ where: { id } })
      return
  }
}

async function create(tx: PrismaTransaction, stored: StoredEvent, payload: InviteePayload) {
  await tx.invitations.create({
    data: {
      id: stored.streamId,
      inviter_id: actorOf(stored, 'an invitation'),
      invitee_email: payload.inviteeEmail,
      invitee_name: payload.inviteeName,
      status: 'pending',
      created_at: stored.occurredAt,
      updated_at: stored.occurredAt,
    },
  })
}
