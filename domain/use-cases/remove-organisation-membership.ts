import { Effect, Either } from 'effect'
import { findMembership, removeMembership } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, Rejected } from './types'
import { runCommand } from './run-command'
import { decideOnPublicFigure, PublicFigureSource } from './public-figure-stream'

export type RemoveOrganisationMembershipParams = {
  contributor: ContributorIdentity | null
  membershipId: string
  runUnitOfWork: RunUnitOfWork
  publicFigureSource: PublicFigureSource
  /** Read side: which figure the affiliation belongs to */
  membershipRepo: OrganisationMembershipRepository
}

const NOT_FOUND = 'Affiliation introuvable.'

/** Removes a wrong affiliation. Ending a real one is done by setting its end date. */
export async function removeOrganisationMembershipUseCase(
  params: RemoveOrganisationMembershipParams,
): Promise<Either.Either<void, string>> {
  const { contributor, membershipId, runUnitOfWork, publicFigureSource, membershipRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'remove_membership')) {
    const rank = requiredRank('remove_membership')
    return Either.left(`Vous devez être ${rank} pour retirer une affiliation.`)
  }

  const membership = await Effect.runPromise(membershipRepo.findById(membershipId))
  if (!membership) {
    return Either.left(NOT_FOUND)
  }

  const outcome = await runCommand(
    runUnitOfWork((events) =>
      decideOnPublicFigure(
        events,
        membership.publicFigureId,
        publicFigureSource,
        contributor.id,
        (state) =>
          findMembership(state, membershipId)
            ? Effect.succeed([removeMembership(membershipId)])
            : Effect.fail(new Rejected(NOT_FOUND)),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return outcome

  return Either.right(undefined)
}
