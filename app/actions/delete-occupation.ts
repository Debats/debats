'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLive } from '../../infra/live-services'
import { deleteOccupationUseCase } from '../../domain/use-cases/delete-occupation'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteOccupationResult = { success: true } | { success: false; error: string }

export async function deleteOccupationAction(
  occupationId: string,
): Promise<DeleteOccupationResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(deleteOccupationUseCase({ contributor, occupationId }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath('/metiers')
  return { success: true }
}
