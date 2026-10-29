import { Effect, pipe } from 'effect'
import { revokeInvitation } from '../aggregates/invitation'
import { runUnitOfWork } from '../events/unit-of-work'
import { ensureStream } from './aggregate-stream'
import { decideOnInvitation, invitationAggregate } from './invitation-stream'

type RevokeInvitationParams = {
  invitationId: string
  /** The inviter, on whose behalf the site withdraws what it could not send */
  actorId: string
}

/** Withdraws an invitation whose e-mail could not leave: it never reached anyone */
export function revokeInvitationUseCase(params: RevokeInvitationParams) {
  const { invitationId, actorId } = params

  return pipe(
    ensureStream(invitationAggregate, invitationId),
    Effect.andThen(
      runUnitOfWork((events) =>
        decideOnInvitation(events, invitationId, actorId, revokeInvitation()),
      ),
    ),
    Effect.asVoid,
  )
}
