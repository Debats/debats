import { Effect } from 'effect'
import { Invitation } from '../entities/invitation'
import { DatabaseError } from './errors'

export interface InvitationRepository {
  create(invitation: Invitation): Effect.Effect<Invitation, DatabaseError>
  deleteById(id: string): Effect.Effect<void, DatabaseError>
  findPendingByEmail(email: string): Effect.Effect<Invitation | null, DatabaseError>
  findPendingByInviter(inviterId: string): Effect.Effect<Invitation[], DatabaseError>
  acceptByEmail(email: string, inviteeId: string): Effect.Effect<void, DatabaseError>
}
