'use server'

import { Either } from 'effect'
import { runLiveForm } from '../../infra/live-services'
import {
  createPositionUseCase,
  FieldErrors,
  NewPosition,
} from '../../domain/use-cases/create-position'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; positionId: string; title: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createPositionAction(
  subjectId: string,
  position: NewPosition,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(createPositionUseCase({ contributor, subjectId, ...position }))

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
