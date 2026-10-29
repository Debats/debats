import { Effect, pipe } from 'effect'
import { findMembership, removeMembership } from '../aggregates/public-figure'
import { runUnitOfWork } from '../events/unit-of-work'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { decideOnPublicFigure, publicFigureAggregate } from './public-figure-stream'

export type RemoveOrganisationMembershipParams = {
  contributor: ContributorIdentity | null
  membershipId: string
}

const NOT_FOUND = 'Affiliation introuvable.'

/** Read side: which figure the affiliation belongs to */
const memberships = Effect.serviceFunctions(OrganisationMembershipRepository)

/** Removes a wrong affiliation. Ending a real one is done by setting its end date. */
export function removeOrganisationMembershipUseCase(params: RemoveOrganisationMembershipParams) {
  const { membershipId } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'remove_membership', 'retirer une affiliation'),
      figureId: Effect.map(
        Effect.flatMap(memberships.findById(membershipId), found(NOT_FOUND)),
        (membership) => membership.publicFigureId,
      ),
    }),
    Effect.tap(({ figureId }) => ensureStream(publicFigureAggregate, figureId)),
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
  )
}
