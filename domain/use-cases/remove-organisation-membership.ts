import { Effect, Either } from 'effect'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

export type RemoveOrganisationMembershipParams = {
  contributor: ContributorIdentity | null
  membershipId: string
  membershipRepo: OrganisationMembershipRepository
}

/** Removes a wrong affiliation. Ending a real one is done by setting its end date. */
export async function removeOrganisationMembershipUseCase(
  params: RemoveOrganisationMembershipParams,
): Promise<Either.Either<void, string>> {
  const { contributor, membershipId, membershipRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'remove_membership')) {
    const rank = requiredRank('remove_membership')
    return Either.left(`Vous devez être ${rank} pour retirer une affiliation.`)
  }

  const membership = await Effect.runPromise(membershipRepo.findById(membershipId))
  if (!membership) {
    return Either.left('Affiliation introuvable.')
  }

  await Effect.runPromise(membershipRepo.delete(membershipId))

  return Either.right(undefined)
}
