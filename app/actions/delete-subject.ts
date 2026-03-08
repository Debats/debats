'use server'

import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { deleteSubjectUseCase } from '../../domain/use-cases/delete-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true } | { success: false; error: string }

export async function deleteSubjectAction(subjectId: string): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await deleteSubjectUseCase({
    contributor,
    subjectId,
    subjectRepo: createSubjectRepository(supabase),
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
