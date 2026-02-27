import { Either, Effect } from 'effect'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { ContributorRepository } from '../repositories/contributor-repository'
import { isExpired } from '../entities/invitation'
import { reputationReward } from '../reputation/permissions'

type AcceptInvitationParams = {
  inviteeId: string
  inviteeEmail: string
  invitationRepo: InvitationRepository
  reputationRepo: ReputationRepository
  contributorRepo: ContributorRepository
}

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
  await Effect.runPromise(invitationRepo.acceptByEmail(inviteeEmail, inviteeId))

  const inviterReputation = await Effect.runPromise(
    reputationRepo.getReputation(invitation.inviterId),
  )

  const inviteeInitialReputation = Math.floor(inviterReputation / 2)
  if (inviteeInitialReputation > 0) {
    await Effect.runPromise(reputationRepo.addReputation(inviteeId, inviteeInitialReputation))
  }

  await Effect.runPromise(
    reputationRepo.addReputation(invitation.inviterId, reputationReward('invitation_accepted')),
  )

  return Either.right(undefined)
}
