import { Effect, Either, pipe } from 'effect'
import { findMembership, removeMembership } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { runCommand } from './run-command'
import {
  decideOnPublicFigure,
  publicFigureAggregate,
  PublicFigureSource,
} from './public-figure-stream'

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
export function removeOrganisationMembershipUseCase(
  params: RemoveOrganisationMembershipParams,
): Promise<Either.Either<void, string>> {
  const { membershipId, runUnitOfWork, publicFigureSource, membershipRepo } = params

  return runCommand(
    pipe(
      Effect.all({
        contributor: allowedTo(params.contributor, 'remove_membership', 'retirer une affiliation'),
        figureId: Effect.map(
          Effect.flatMap(membershipRepo.findById(membershipId), found(NOT_FOUND)),
          (membership) => membership.publicFigureId,
        ),
      }),
      Effect.tap(({ figureId }) =>
        ensureStream(publicFigureAggregate, runUnitOfWork, figureId, publicFigureSource),
      ),
      Effect.flatMap(({ contributor, figureId }) =>
        runUnitOfWork((events) =>
          decideOnPublicFigure(events, figureId, contributor.id, (state) =>
            findMembership(state, membershipId)
              ? Effect.succeed([removeMembership(membershipId)])
              : Effect.fail(new Rejected(NOT_FOUND)),
          ),
        ),
      ),
      Effect.asVoid,
    ),
  )
}
