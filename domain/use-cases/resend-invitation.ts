import { Effect } from 'effect'
import { InvitationRepository } from '../repositories/invitation-repository'
import { isExpired, Invitation } from '../entities/invitation'

type ValidateResendParams = {
  email: string
  invitationRepo: InvitationRepository
}

export const validateResendInvitation = (
  params: ValidateResendParams,
): Effect.Effect<Invitation, string> =>
  params.invitationRepo.findPendingByEmail(params.email).pipe(
    Effect.mapError(() => 'Erreur lors de la recherche de l\u2019invitation.'),
    Effect.flatMap((invitation) =>
      invitation === null
        ? Effect.fail('Aucune invitation en attente pour cette adresse e-mail.')
        : Effect.succeed(invitation),
    ),
    Effect.filterOrFail(
      (invitation) => !isExpired(invitation),
      () =>
        'L\u2019invitation a expiré. Demandez à la personne qui vous a invité·e de vous réinviter.',
    ),
  )
