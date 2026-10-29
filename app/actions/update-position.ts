'use server'

import { Either } from 'effect'
import { runLiveForm } from '../../infra/live-services'
import { updatePositionUseCase, FieldErrors } from '../../domain/use-cases/update-position'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { revisionOf } from './form-revision'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updatePositionAction(
  positionId: string,
  formData: FormData,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(
    updatePositionUseCase({
      contributor,
      positionId,
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? ''),
      revision: revisionOf(formData),
    }),
  )

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true }
}
