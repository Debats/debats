'use server'

import { Either } from 'effect'
import { runLiveForm } from '../../infra/live-services'
import { parseStatementType } from '../../domain/entities/statement'
import { updateStatementUseCase, FieldErrors } from '../../domain/use-cases/update-statement'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { revisionOf } from './form-revision'
import { readStatementArguments } from './statement-arguments-fields'

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
      statementType: parseStatementType(formData.get('statementType')),
      sourceName: String(formData.get('sourceName') ?? ''),
      sourceUrl: String(formData.get('sourceUrl') ?? ''),
      quote: String(formData.get('quote') ?? ''),
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
