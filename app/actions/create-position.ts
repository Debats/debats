'use server'

import { Either } from 'effect'
import { runLiveForm } from '../../infra/live-services'
import { createPositionUseCase, FieldErrors } from '../../domain/use-cases/create-position'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; positionId: string; title: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createPositionAction(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(
    createPositionUseCase({
      contributor,
      subjectId,
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? ''),
    }),
  )

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return {
    success: true,
    positionId: result.right.id,
    title: result.right.title,
  }
}
