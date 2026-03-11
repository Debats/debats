'use server'

import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { createPositionUseCase, FieldErrors } from '../../domain/use-cases/create-position'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; positionId: string; title: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createPositionAction(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createPositionUseCase({
    contributor,
    subjectId,
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    positionRepo: createPositionRepository(supabase),
    subjectRepo: createSubjectRepository(supabase),
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return {
    success: true,
    positionId: result.right.id,
    title: result.right.title,
  }
}
