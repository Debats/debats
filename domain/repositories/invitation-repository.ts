import { Context, Effect } from 'effect'
import { Invitation } from '../entities/invitation'
import { DatabaseError } from './errors'

/** Reads the invitations projection; writing goes through the journal */
export interface InvitationRepository {
  findById(id: string): Effect.Effect<Invitation | null, DatabaseError>
  findPendingByEmail(email: string): Effect.Effect<Invitation | null, DatabaseError>
  findPendingByInviter(inviterId: string): Effect.Effect<Invitation[], DatabaseError>
}

export const InvitationRepository = Context.GenericTag<InvitationRepository>('InvitationRepository')
