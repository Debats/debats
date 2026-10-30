import { Effect, pipe } from 'effect'
import { MEMBERSHIP_NOT_FOUND, removeMembership } from '../aggregates/public-figure'
import { runUnitOfWork } from '../events/unit-of-work'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { ContributorIdentity } from './types'
import { allowedTo, found } from './preconditions'
import { decideOnPublicFigure, publicFigureAggregate } from './public-figure-stream'

export type RemoveOrganisationMembershipParams = {
  contributor: ContributorIdentity | null
  membershipId: string
}

/** Read side: which figure the affiliation belongs to */
const memberships = Effect.serviceFunctions(OrganisationMembershipRepository)

/** Removes a wrong affiliation. Ending a real one is done by setting its end date. */
export function removeOrganisationMembershipUseCase(params: RemoveOrganisationMembershipParams) {
  const { membershipId } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'remove_membership', 'retirer une affiliation'),
      figureId: Effect.map(
        Effect.flatMap(memberships.findById(membershipId), found(MEMBERSHIP_NOT_FOUND)),
        (membership) => membership.publicFigureId,
      ),
    }),
    Effect.flatMap(({ contributor, figureId }) =>
      runUnitOfWork((events) =>
        decideOnPublicFigure(events, figureId, contributor.id, removeMembership(membershipId)),
      ),
    ),
    Effect.asVoid,
  )
}
