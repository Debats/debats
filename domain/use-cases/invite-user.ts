import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { Invitation, InvitationId, InviteeEmail, InviteeName } from '../entities/invitation'
import { sendInvitation } from '../aggregates/invitation'
import { RunUnitOfWork } from '../events/unit-of-work'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ContributorRepository } from '../repositories/contributor-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { openStream } from './aggregate-stream'
import { invitationAggregate } from './invitation-stream'
import { runCommand, uniqueTakenAs } from './run-command'

const MAX_PENDING_INVITATIONS = 5
const ALREADY_INVITED = 'Cette personne a déjà été invitée.'

const InviteUserInput = S.Struct({
  email: InviteeEmail,
  name: InviteeName,
})

type Contributor = { id: string; reputation: number }

type InviteUserParams = {
  contributor: Contributor | null
  email: string
  name: string
  runUnitOfWork: RunUnitOfWork
  /** Read side: the inviter's pending invitations, and whether the address is already invited */
  invitationRepo: InvitationRepository
  contributorRepo: ContributorRepository
}

export async function inviteUserUseCase(
  params: InviteUserParams,
): Promise<Either.Either<Invitation, string>> {
  const { contributor, email, name, runUnitOfWork, invitationRepo, contributorRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'invite_user')) {
    const rank = requiredRank('invite_user')
    return Either.left(`Vous devez être ${rank} pour inviter.`)
  }

  const decoded = S.decodeUnknownEither(InviteUserInput)({ email, name })

  if (Either.isLeft(decoded)) {
    return Either.left('Données invalides. Vérifiez les champs du formulaire.')
  }

  const input = decoded.right

  const emailExists = await Effect.runPromise(contributorRepo.existsByEmail(input.email))
  if (emailExists) {
    return Either.left('Un compte avec cette adresse courriel existe déjà.')
  }

  const pendingInvitations = await Effect.runPromise(
    invitationRepo.findPendingByInviter(contributor.id),
  )

  if (pendingInvitations.length >= MAX_PENDING_INVITATIONS) {
    return Either.left(
      `Vous avez déjà ${MAX_PENDING_INVITATIONS} invitations en attente. Attendez qu'elles soient acceptées.`,
    )
  }

  const existingInvitation = await Effect.runPromise(invitationRepo.findPendingByEmail(input.email))

  if (existingInvitation) {
    return Either.left(ALREADY_INVITED)
  }

  // The command names the invitation: the stream exists from its first event
  const id = InvitationId.make(crypto.randomUUID())
  const outcome = await runCommand(
    pipe(
      runUnitOfWork((events) =>
        openStream(
          invitationAggregate,
          events,
          id,
          [sendInvitation({ inviteeEmail: input.email, inviteeName: input.name })],
          contributor.id,
        ),
      ),
      uniqueTakenAs('email', ALREADY_INVITED),
    ),
  )

  return Either.map(outcome, ({ state }) => state.invitation)
}
