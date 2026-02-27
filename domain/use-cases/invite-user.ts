import { Either, Effect } from 'effect'
import * as S from 'effect/Schema'
import { createInvitation, Invitation, InviteeEmail, InviteeName } from '../entities/invitation'
import { InvitationRepository } from '../repositories/invitation-repository'
import { ContributorRepository } from '../repositories/contributor-repository'
import { canPerform, requiredRank } from '../reputation/permissions'

const MAX_PENDING_INVITATIONS = 5

const InviteUserInput = S.Struct({
  email: InviteeEmail,
  name: InviteeName,
})

type Contributor = { id: string; reputation: number }

type InviteUserParams = {
  contributor: Contributor | null
  email: string
  name: string
  invitationRepo: InvitationRepository
  contributorRepo: ContributorRepository
}

export async function inviteUserUseCase(
  params: InviteUserParams,
): Promise<Either.Either<Invitation, string>> {
  const { contributor, email, name, invitationRepo, contributorRepo } = params

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
    return Either.left('Cette personne a déjà été invitée.')
  }

  const invitation = createInvitation({
    inviterId: contributor.id,
    inviteeEmail: input.email,
    inviteeName: input.name,
  })

  const created = await Effect.runPromise(invitationRepo.create(invitation))

  return Either.right(created)
}
