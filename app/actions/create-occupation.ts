'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOccupationRepository } from '../../infra/database/occupation-repository-supabase'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createOccupationFamilySource } from '../../infra/events/sources'
import { createOccupationUseCase } from '../../domain/use-cases/create-occupation'
import { FieldErrors } from '../../domain/use-cases/types'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type CreateOccupationResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createOccupationAction(formData: FormData): Promise<CreateOccupationResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createOccupationUseCase({
    contributor,
    name: String(formData.get('name') ?? ''),
    familyId: String(formData.get('familyId') ?? ''),
    description: String(formData.get('description') ?? ''),
    runUnitOfWork,
    familySource: createOccupationFamilySource(supabase),
    occupationRepo: createOccupationRepository(supabase),
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
