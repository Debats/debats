'use server'

import { redirect } from 'next/navigation'
import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { updateSubjectUseCase } from '../../domain/use-cases/update-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

type ActionResult = { success: true } | { success: false; error: string }

export async function updateSubjectAction(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
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

  redirect(`/s/${result.right.slug}`)
}
