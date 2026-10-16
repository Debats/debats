'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOccupationRepository } from '../../infra/database/occupation-repository-supabase'
import { deleteOccupationUseCase } from '../../domain/use-cases/delete-occupation'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteOccupationResult = { success: true } | { success: false; error: string }

export async function deleteOccupationAction(
  occupationId: string,
): Promise<DeleteOccupationResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await deleteOccupationUseCase({
    contributor,
    occupationId,
    occupationRepo: createOccupationRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath('/metiers')
  return { success: true }
}
