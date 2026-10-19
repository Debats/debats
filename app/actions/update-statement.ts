'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { parseStatementType } from '../../domain/entities/statement'
import { updateStatementUseCase, FieldErrors } from '../../domain/use-cases/update-statement'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { readStatementArguments } from './statement-arguments-fields'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updateStatementAction(
  statementId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await updateStatementUseCase({
    contributor,
    statementId,
    positionId: String(formData.get('positionId') ?? ''),
    statementType: parseStatementType(formData.get('statementType')),
    sourceName: String(formData.get('sourceName') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? ''),
    quote: String(formData.get('quote') ?? ''),
    statedAt: String(formData.get('statedAt') ?? ''),
    arguments: readStatementArguments(formData),
    runUnitOfWork,
    statementRepo: createStatementRepository(supabase),
    positionRepo: createPositionRepository(supabase),
    argumentRepo: createArgumentRepository(supabase),
    reputationRepo: createReputationRepository(supabase),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true }
}
