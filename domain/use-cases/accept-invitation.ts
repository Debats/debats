import { Either, Effect, pipe } from 'effect'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { ContributorRepository } from '../repositories/contributor-repository'
import { RunUnitOfWork } from '../events/unit-of-work'
import { Invitation, isExpired } from '../entities/invitation'
import { acceptInvitation, isPendingInvitation } from '../aggregates/invitation'
import { ensureStream } from './aggregate-stream'
import { found } from './preconditions'
import { decideOnInvitation, invitationAggregate, InvitationSource } from './invitation-stream'
import { Grant, grantEach, rewardFor } from './reward'
import { runCommand } from './run-command'
import { Rejected } from './types'

type AcceptInvitationParams = {
  inviteeId: string
  inviteeEmail: string
  /** Read side: which pending invitation the address has */
  invitationRepo: InvitationRepository
  invitationSource: InvitationSource
  /** Read side: the inviter's reputation sets the invitee's start */
  reputationRepo: ReputationRepository
  contributorRepo: ContributorRepository
  runUnitOfWork: RunUnitOfWork
}

const ALREADY_ACCEPTED = 'Cette invitation a déjà été acceptée.'

/** The invitee starts with half the inviter's reputation, the inviter is rewarded */
function grantsFor(invitation: Invitation, inviteeId: string, inviterReputation: number): Grant[] {
  const on = { relatedEntityType: 'invitation' as const, relatedEntityId: invitation.id }
  const inviteeStart = Math.floor(inviterReputation / 2)
  return [
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
}

/**
 * The invitee joins with half the inviter's reputation, and the inviter is
 * rewarded. The acceptance is written on the invitation's stream, at its
 * revision, in the transaction of both grants: a second acceptance, at once
 * or later, finds the invitation gone past pending and is refused.
 */
export function acceptInvitationUseCase(
  params: AcceptInvitationParams,
): Promise<Either.Either<void, string>> {
  const { inviteeId, inviteeEmail, invitationRepo, reputationRepo, contributorRepo } = params
  const { runUnitOfWork, invitationSource } = params

  return runCommand(
    pipe(
      invitationRepo.findPendingByEmail(inviteeEmail),
      Effect.flatMap(found('Aucune invitation en attente pour cette adresse e-mail.')),
      Effect.filterOrFail(
        (invitation) => !isExpired(invitation),
        () => new Rejected('L’invitation a expiré. Demandez une nouvelle invitation.'),
      ),
      Effect.bindTo('invitation'),
      // The profile is written outside the journal, by choice: it belongs to authentication
      Effect.tap(() => contributorRepo.ensureExists(inviteeId)),
      Effect.bind('grants', ({ invitation }) =>
        Effect.map(reputationRepo.getReputation(invitation.inviterId), (inviterReputation) =>
          grantsFor(invitation, inviteeId, inviterReputation),
        ),
      ),
      Effect.tap(({ invitation }) =>
        ensureStream(invitationAggregate, runUnitOfWork, invitation.id, invitationSource),
      ),
      Effect.flatMap(({ invitation, grants }) =>
        runUnitOfWork((events) =>
          pipe(
            decideOnInvitation(events, invitation.id, inviteeId, (state) =>
              isPendingInvitation(state)
                ? Effect.succeed([acceptInvitation(inviteeId)])
                : Effect.fail(new Rejected(ALREADY_ACCEPTED)),
            ),
            Effect.andThen(grantEach(events, inviteeId, grants)),
          ),
        ),
      ),
    ),
  )
}
