import { Effect, pipe } from 'effect'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { ContributorRepository } from '../repositories/contributor-repository'
import { runUnitOfWork } from '../events/unit-of-work'
import { Invitation, isExpired } from '../entities/invitation'
import { acceptInvitation } from '../aggregates/invitation'
import { found } from './preconditions'
import { decideOnInvitation, invitationAggregate } from './invitation-stream'
import { Grant, grantEach, grantOf, rewardFor } from './reward'
import { Rejected } from './types'

type AcceptInvitationParams = {
  inviteeId: string
  inviteeEmail: string
}

/** Read side: which pending invitation the address has, and the inviter's reputation */
const invitations = Effect.serviceFunctions(InvitationRepository)
const reputations = Effect.serviceFunctions(ReputationRepository)
const contributors = Effect.serviceFunctions(ContributorRepository)

/** The invitee starts with half the inviter's reputation, the inviter is rewarded */
function grantsFor(invitation: Invitation, inviteeId: string, inviterReputation: number): Grant[] {
  const on = { relatedEntityType: 'invitation' as const, relatedEntityId: invitation.id }
  const inviteeStart = Math.floor(inviterReputation / 2)
  return [
    ...(inviteeStart > 0 ? [grantOf(inviteeId, 'invitation_bonus', inviteeStart, on)] : []),
    rewardFor(invitation.inviterId, 'invitation_accepted', on),
  ]
}

/**
 * The invitee joins with half the inviter's reputation, and the inviter is
 * rewarded. The acceptance is written on the invitation's stream, at its
 * revision, in the transaction of both grants: a second acceptance, at once
 * or later, finds the invitation gone past pending and is refused.
 */
export function acceptInvitationUseCase(params: AcceptInvitationParams) {
  const { inviteeId, inviteeEmail } = params

  return pipe(
    invitations.findPendingByEmail(inviteeEmail),
    Effect.flatMap(found('Aucune invitation en attente pour cette adresse e-mail.')),
    Effect.filterOrFail(
      (invitation) => !isExpired(invitation),
      () => new Rejected('L’invitation a expiré. Demandez une nouvelle invitation.'),
    ),
    Effect.bindTo('invitation'),
    // The profile is written outside the journal, by choice: it belongs to authentication
    Effect.tap(() => contributors.ensureExists(inviteeId)),
    Effect.bind('grants', ({ invitation }) =>
      Effect.map(reputations.getReputation(invitation.inviterId), (inviterReputation) =>
        grantsFor(invitation, inviteeId, inviterReputation),
      ),
    ),
    Effect.flatMap(({ invitation, grants }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnInvitation(events, invitation.id, inviteeId, acceptInvitation(inviteeId)),
          Effect.andThen(grantEach(events, inviteeId, grants)),
        ),
      ),
    ),
    Effect.asVoid,
  )
}
