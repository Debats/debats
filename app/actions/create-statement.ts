'use server'

import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { createStatementUseCase, FieldErrors } from '../../domain/use-cases/create-statement'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createStatementAction(
  subjectId: string,
  _slug: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createStatementUseCase({
    contributor,
    subjectId,
    publicFigureId: String(formData.get('publicFigureId') ?? ''),
    positionId: String(formData.get('positionId') ?? ''),
    sourceName: String(formData.get('sourceName') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? ''),
    quote: String(formData.get('quote') ?? ''),
    statedAt: String(formData.get('statedAt') ?? ''),
    statementRepo: createStatementRepository(supabase),
    positionRepo: createPositionRepository(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
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
