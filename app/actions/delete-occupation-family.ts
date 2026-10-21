'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createOccupationFamilySource } from '../../infra/events/sources'
import { deleteOccupationFamilyUseCase } from '../../domain/use-cases/delete-occupation-family'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteOccupationFamilyResult = { success: true } | { success: false; error: string }

export async function deleteOccupationFamilyAction(
  familyId: string,
): Promise<DeleteOccupationFamilyResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await deleteOccupationFamilyUseCase({
    contributor,
    familyId,
    runUnitOfWork,
    familySource: createOccupationFamilySource(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath('/metiers')
  return { success: true }
}
