import { Effect, Either, pipe } from 'effect'
import { revokeInvitation } from '../aggregates/invitation'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ensureStream } from './aggregate-stream'
import { decideOnInvitation, invitationAggregate, InvitationSource } from './invitation-stream'
import { runCommand } from './run-command'

type RevokeInvitationParams = {
  invitationId: string
  /** The inviter, on whose behalf the site withdraws what it could not send */
  actorId: string
  runUnitOfWork: RunUnitOfWork
  invitationSource: InvitationSource
}

/** Withdraws an invitation whose e-mail could not leave: it never reached anyone */
export async function revokeInvitationUseCase(
  params: RevokeInvitationParams,
): Promise<Either.Either<void, string>> {
  const { invitationId, actorId, runUnitOfWork, invitationSource } = params
  const outcome = await runCommand(
    pipe(
      ensureStream(invitationAggregate, runUnitOfWork, invitationId, invitationSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          decideOnInvitation(events, invitationId, actorId, () =>
            Effect.succeed([revokeInvitation()]),
          ),
        ),
      ),
    ),
  )
  return Either.map(outcome, () => undefined)
}
