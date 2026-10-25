import { Either, Effect } from 'effect'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { ContributorRepository } from '../repositories/contributor-repository'
import { RunUnitOfWork } from '../events/unit-of-work'
import { isExpired } from '../entities/invitation'
import { Grant, grantEach, rewardFor } from './reward'
import { runCommand } from './run-command'

type AcceptInvitationParams = {
  inviteeId: string
  inviteeEmail: string
  invitationRepo: InvitationRepository
  /** Read side: the inviter's reputation sets the invitee's start */
  reputationRepo: ReputationRepository
  contributorRepo: ContributorRepository
  runUnitOfWork: RunUnitOfWork
}

/**
 * The invitee joins with half the inviter's reputation, and the inviter is
 * rewarded. The invitation is consumed in the transaction of both grants,
 * signed by the invitee: a failure leaves it pending, to be accepted again.
 */
export async function acceptInvitationUseCase(
  params: AcceptInvitationParams,
): Promise<Either.Either<void, string>> {
  const { inviteeId, inviteeEmail, invitationRepo, reputationRepo, contributorRepo } = params

  const invitation = await Effect.runPromise(invitationRepo.findPendingByEmail(inviteeEmail))

  if (!invitation) {
    return Either.left('Aucune invitation en attente pour cette adresse e-mail.')
  }

  if (isExpired(invitation)) {
    return Either.left('L\u2019invitation a expiré. Demandez une nouvelle invitation.')
  }

  await Effect.runPromise(contributorRepo.ensureExists(inviteeId))

  const inviterReputation = await Effect.runPromise(
    reputationRepo.getReputation(invitation.inviterId),
  )
  const on = { relatedEntityType: 'invitation' as const, relatedEntityId: invitation.id }
  const inviteeStart = Math.floor(inviterReputation / 2)
  const grants: Grant[] = [
    ...(inviteeStart > 0
      ? [
          {
            grantId: crypto.randomUUID(),
            contributorId: inviteeId,
            action: 'invitation_bonus' as const,
            amount: inviteeStart,
            ...on,
          },
        ]
      : []),
    rewardFor(invitation.inviterId, 'invitation_accepted', on),
  ]

  return runCommand(
    params.runUnitOfWork((events, process) =>
      Effect.andThen(
        process.acceptInvitation(inviteeEmail, inviteeId),
        grantEach(events, inviteeId, grants),
      ),
    ),
  )
}
