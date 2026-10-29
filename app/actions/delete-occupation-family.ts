'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLive } from '../../infra/live-services'
import { deleteOccupationFamilyUseCase } from '../../domain/use-cases/delete-occupation-family'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteOccupationFamilyResult = { success: true } | { success: false; error: string }

export async function deleteOccupationFamilyAction(
  familyId: string,
): Promise<DeleteOccupationFamilyResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(deleteOccupationFamilyUseCase({ contributor, familyId }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath('/metiers')
  return { success: true }
}
