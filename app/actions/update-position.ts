'use server'

import { Either } from 'effect'
import { runLiveForm } from '../../infra/live-services'
import {
  updatePositionUseCase,
  EditedPosition,
  FieldErrors,
} from '../../domain/use-cases/update-position'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updatePositionAction(
  positionId: string,
  edited: EditedPosition,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(updatePositionUseCase({ contributor, positionId, ...edited }))

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true }
}
