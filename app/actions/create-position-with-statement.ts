'use server'

import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import {
  createPositionWithStatementUseCase,
  FieldErrors,
} from '../../domain/use-cases/create-position-with-statement'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createPositionWithStatementAction(
  subjectId: string,
  _slug: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createPositionWithStatementUseCase({
    contributor,
    subjectId,
    publicFigureId: String(formData.get('publicFigureId') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    sourceName: String(formData.get('sourceName') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? ''),
    quote: String(formData.get('quote') ?? ''),
    factDate: String(formData.get('factDate') ?? ''),
    positionRepo: createPositionRepository(supabase),
    statementRepo: createStatementRepository(supabase),
    subjectRepo: createSubjectRepository(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
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
