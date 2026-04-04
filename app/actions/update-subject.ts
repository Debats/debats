'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { updateSubjectUseCase } from '../../domain/use-cases/update-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true; slug: string } | { success: false; error: string }

export async function updateSubjectAction(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await updateSubjectUseCase({
    contributor,
    subjectId,
    title: String(formData.get('title') ?? ''),
    presentation: String(formData.get('presentation') ?? ''),
    problem: String(formData.get('problem') ?? ''),
    subjectRepo: createSubjectRepository(supabase),
    reputationRepo: createReputationRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true, slug: result.right.slug }
}
