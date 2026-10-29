'use server'

import * as Sentry from '@sentry/nextjs'
import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runLive } from '../../infra/live-services'
import { inviteUserUseCase } from '../../domain/use-cases/invite-user'
import { revokeInvitationUseCase } from '../../domain/use-cases/revoke-invitation'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type InviteActionResult =
  | { success: true; email: string }
  | { success: false; error: string }

export async function inviteUserAction(formData: FormData): Promise<InviteActionResult> {
  const contributor = await getAuthenticatedContributor()
  const admin = createAdminSupabaseClient()

  const email = String(formData.get('email') ?? '')
  const name = String(formData.get('name') ?? '')

  let result
  try {
    result = await runLive(inviteUserUseCase({ contributor, email, name }), admin)
  } catch (error) {
    Sentry.captureException(error, { extra: { email } })
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la création de l’invitation.',
    }
  }

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  const invitation = result.right

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
  })

  if (inviteError) {
    Sentry.captureException(inviteError, {
      extra: { email, invitationId: invitation.id, errorStatus: inviteError.status },
    })
    // The invitation never reached anyone: it is withdrawn, on behalf of the inviter
    await runLive(
      revokeInvitationUseCase({ invitationId: invitation.id, actorId: invitation.inviterId }),
      admin,
    ).catch((revokeError) =>
      Sentry.captureException(revokeError, {
        extra: { invitationId: invitation.id, originalError: inviteError.message },
      }),
    )
    return {
      success: false,
      error: inviteError.message
        ? `Erreur lors de l'envoi de l'invitation : ${inviteError.message}`
        : "Erreur lors de l'envoi de l'invitation. Veuillez réessayer.",
    }
  }

  return { success: true, email }
}
