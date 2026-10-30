'use server'

import { Either } from 'effect'
import { runLiveForm } from '../../infra/live-services'
import { updateStatementUseCase, FieldErrors } from '../../domain/use-cases/update-statement'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { revisionOf } from './form-revision'
import { readStatementArguments } from './statement-arguments-fields'
import { readStatementContent } from './statement-content-fields'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updateStatementAction(
  statementId: string,
  formData: FormData,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(
    updateStatementUseCase({
      contributor,
      statementId,
      positionId: String(formData.get('positionId') ?? ''),
      content: readStatementContent(formData),
      sourceName: String(formData.get('sourceName') ?? ''),
      sourceUrl: String(formData.get('sourceUrl') ?? ''),
      statedAt: String(formData.get('statedAt') ?? ''),
      arguments: readStatementArguments(formData),
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
