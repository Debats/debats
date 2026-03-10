'use server'

import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import {
  createPublicFigureWithStatementUseCase,
  FieldErrors,
} from '../../domain/use-cases/create-public-figure-with-statement'
import { createWikipediaValidator } from '../../infra/wikipedia/wikipedia-validator'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createPublicFigureWithStatementAction(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const notorietySources = formData
    .getAll('notorietySources')
    .map((v) => String(v))
    .filter((v) => v.length > 0)

  const result = await createPublicFigureWithStatementUseCase({
    contributor,
    name: String(formData.get('name') ?? ''),
    presentation: String(formData.get('presentation') ?? ''),
    wikipediaUrl: String(formData.get('wikipediaUrl') ?? ''),
    websiteUrl: String(formData.get('websiteUrl') ?? ''),
    notorietySources,
    subjectId: String(formData.get('subjectId') ?? ''),
    positionId: String(formData.get('positionId') ?? ''),
    sourceName: String(formData.get('sourceName') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? ''),
    quote: String(formData.get('quote') ?? ''),
    factDate: String(formData.get('factDate') ?? ''),
    positionRepo: createPositionRepository(supabase),
    statementRepo: createStatementRepository(supabase),
    subjectRepo: createSubjectRepository(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
    wikipediaValidator: createWikipediaValidator(),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true, slug: result.right.slug }
}
