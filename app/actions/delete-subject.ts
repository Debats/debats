'use server'

import { redirect } from 'next/navigation'
import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { deleteSubjectUseCase } from '../../domain/use-cases/delete-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

type ActionResult = { success: true } | { success: false; error: string }

export async function deleteSubjectAction(subjectId: string): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await deleteSubjectUseCase({
    contributor,
    subjectId,
    subjectRepo: createSubjectRepository(supabase),
    reputationRepo: createReputationRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  redirect('/s')
}
