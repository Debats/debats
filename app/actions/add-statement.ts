'use server'

import { Either, Effect } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { createStatementUseCase, FieldErrors } from '../../domain/use-cases/create-statement'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; subjectSlug: string; figureSlug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function addStatementAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const subjectId = String(formData.get('subjectId') ?? '')
  const publicFigureId = String(formData.get('publicFigureId') ?? '')

  const publicFigureRepo = createPublicFigureRepository(supabase)
  const subjectRepo = createSubjectRepository(supabase)

  const result = await createStatementUseCase({
    contributor,
    subjectId,
    publicFigureId,
    positionId: String(formData.get('positionId') ?? ''),
    sourceName: String(formData.get('sourceName') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? ''),
    quote: String(formData.get('quote') ?? ''),
    statedAt: String(formData.get('statedAt') ?? ''),
    statementRepo: createStatementRepository(supabase),
    positionRepo: createPositionRepository(supabase),
    publicFigureRepo,
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  const figure = await Effect.runPromise(publicFigureRepo.findById(publicFigureId))
  const subject = await Effect.runPromise(subjectRepo.findById(subjectId))

  return {
    success: true,
    subjectSlug: subject?.slug ?? '',
    figureSlug: figure?.slug ?? '',
  }
}
