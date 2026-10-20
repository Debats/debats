'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createSubjectSource } from '../../infra/events/sources'
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
    runUnitOfWork,
    subjectSource: createSubjectSource(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true, slug: result.right.slug }
}
