import { Effect } from 'effect'
import { ProcessState } from '../../domain/events/unit-of-work'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'

/** The process state on its tables, bound to the transaction of the command that writes it */
export function createProcessState(tx: PrismaTransaction): ProcessState {
  return {
    acceptInvitation: (email, inviteeId) =>
      Effect.tryPromise({
        try: () =>
          tx.invitations.updateMany({
            where: { invitee_email: email, status: 'pending' },
            data: { status: 'accepted', invitee_id: inviteeId },
          }),
        catch: (error) => databaseError('Failed to accept the invitation', error),
      }).pipe(Effect.asVoid),
  }
}
