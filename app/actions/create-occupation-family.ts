'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOccupationFamilyRepository } from '../../infra/database/occupation-family-repository-supabase'
import { createOccupationFamilyUseCase } from '../../domain/use-cases/create-occupation-family'
import { FieldErrors } from '../../domain/use-cases/types'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type CreateOccupationFamilyResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createOccupationFamilyAction(
  formData: FormData,
): Promise<CreateOccupationFamilyResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createOccupationFamilyUseCase({
    contributor,
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    familyRepo: createOccupationFamilyRepository(supabase),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  revalidatePath('/metiers')
  return { success: true, slug: result.right.slug }
}
