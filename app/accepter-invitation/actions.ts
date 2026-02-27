'use server'

import * as Sentry from '@sentry/nextjs'
import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createInvitationRepository } from '../../infra/database/invitation-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { createContributorRepository } from '../../infra/database/contributor-repository-supabase'
import { acceptInvitationUseCase } from '../../domain/use-cases/accept-invitation'

type AcceptInvitationResult = { success: true } | { success: false; error: string }

export async function acceptInvitation(
  tokenHash: string,
  formData: FormData,
): Promise<AcceptInvitationResult> {
  const password = formData.get('password') as string
  const passwordConfirmation = formData.get('password_confirmation') as string

  if (password !== passwordConfirmation) {
    return { success: false, error: 'Les mots de passe ne correspondent pas.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  const supabase = await createSSRSupabaseClient()

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'invite',
  })

  if (verifyError) {
    return {
      success: false,
      error:
        'Le lien d\u2019invitation a expiré ou est invalide. Demandez une nouvelle invitation.',
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })

  if (updateError) {
    Sentry.captureException(updateError, { extra: { step: 'updateUser password' } })
    return {
      success: false,
      error: `Erreur lors de la définition du mot de passe. (${updateError.message})`,
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    Sentry.captureMessage('Accept invitation: user or email missing after verifyOtp + updateUser', {
      level: 'error',
    })
    return { success: false, error: 'Erreur inattendue lors de la création du compte.' }
  }

  const admin = createAdminSupabaseClient()

  try {
    const result = await acceptInvitationUseCase({
      inviteeId: user.id,
      inviteeEmail: user.email,
      invitationRepo: createInvitationRepository(admin),
      reputationRepo: createReputationRepository(admin),
      contributorRepo: createContributorRepository(admin),
    })

    if (Either.isLeft(result)) {
      return { success: false, error: result.left }
    }
  } catch (error) {
    Sentry.captureException(error, {
      extra: { inviteeId: user.id, inviteeEmail: user.email },
    })
    return {
      success: false,
      error: 'Une erreur inattendue est survenue lors de l\u2019acceptation de l\u2019invitation.',
    }
  }

  return { success: true }
}
