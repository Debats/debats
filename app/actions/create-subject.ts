'use server'

import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { createSubjectUseCase } from '../../domain/use-cases/create-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true; slug: string } | { success: false; error: string }

export async function createSubjectAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createSubjectUseCase({
    contributor,
    title: String(formData.get('title') ?? ''),
    presentation: String(formData.get('presentation') ?? ''),
    problem: String(formData.get('problem') ?? ''),
    subjectRepo: createSubjectRepository(supabase),
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true, slug: result.right.slug }
}
