'use server'

import * as Sentry from '@sentry/nextjs'
import { Either, Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createInvitationRepository } from '../../infra/database/invitation-repository-supabase'
import { createContributorRepository } from '../../infra/database/contributor-repository-supabase'
import { inviteUserUseCase } from '../../domain/use-cases/invite-user'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type InviteActionResult =
  | { success: true; email: string }
  | { success: false; error: string }

export async function inviteUserAction(formData: FormData): Promise<InviteActionResult> {
  const contributor = await getAuthenticatedContributor()
  const admin = createAdminSupabaseClient()
  const invitationRepo = createInvitationRepository(admin)

  const email = String(formData.get('email') ?? '')
  const name = String(formData.get('name') ?? '')

  let result
  try {
    result = await inviteUserUseCase({
      contributor,
      email,
      name,
      invitationRepo,
      contributorRepo: createContributorRepository(admin),
    })
  } catch (error) {
    Sentry.captureException(error, { extra: { email } })
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de la création de l\u2019invitation.',
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
    await Effect.runPromise(invitationRepo.deleteById(invitation.id)).catch((deleteError) =>
      Sentry.captureException(deleteError, {
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
