'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createSubjectUseCase, FieldErrors } from '../../domain/use-cases/create-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string; title: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createSubjectAction(formData: FormData): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createSubjectUseCase({
    contributor,
    title: String(formData.get('title') ?? ''),
    presentation: String(formData.get('presentation') ?? ''),
    problem: String(formData.get('problem') ?? ''),
    runUnitOfWork,
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true, slug: result.right.slug, title: result.right.title }
}
