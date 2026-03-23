'use server'

import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { updatePositionUseCase, FieldErrors } from '../../domain/use-cases/update-position'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updatePositionAction(
  positionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await updatePositionUseCase({
    contributor,
    positionId,
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    positionRepo: createPositionRepository(supabase),
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true }
}
