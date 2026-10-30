import { Effect } from 'effect'
import { revokeInvitation } from '../aggregates/invitation'
import { runUnitOfWork } from '../events/unit-of-work'
import { decideOnInvitation } from './invitation-stream'

type RevokeInvitationParams = {
  invitationId: string
  /** The inviter, on whose behalf the site withdraws what it could not send */
  actorId: string
}

/** Withdraws an invitation whose e-mail could not leave: it never reached anyone */
export function revokeInvitationUseCase(params: RevokeInvitationParams) {
  const { invitationId, actorId } = params

  return Effect.asVoid(
    runUnitOfWork((events) =>
      decideOnInvitation(events, invitationId, actorId, revokeInvitation()),
    ),
  )
}
