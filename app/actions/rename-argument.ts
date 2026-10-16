'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'
import { renameArgumentUseCase, FieldErrors } from '../../domain/use-cases/rename-argument'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function renameArgumentAction(
  argumentId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await renameArgumentUseCase({
    contributor,
    argumentId,
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    argumentRepo: createArgumentRepository(supabase),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  revalidatePath('/arguments')
  return { success: true, slug: result.right.slug }
}
