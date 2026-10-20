'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import { parseStatementType, publicFigureAuthor } from '../../domain/entities/statement'
import { createStatementUseCase, FieldErrors } from '../../domain/use-cases/create-statement'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { readStatementArguments } from './statement-arguments-fields'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createStatementAction(
  subjectId: string,
  _slug: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createStatementUseCase({
    contributor,
    subjectId,
    author: publicFigureAuthor(String(formData.get('publicFigureId') ?? '')),
    positionId: String(formData.get('positionId') ?? ''),
    statementType: parseStatementType(formData.get('statementType')),
    sourceName: String(formData.get('sourceName') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? ''),
    quote: String(formData.get('quote') ?? ''),
    statedAt: String(formData.get('statedAt') ?? ''),
    arguments: readStatementArguments(formData),
    runUnitOfWork,
    positionRepo: createPositionRepository(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
    organisationRepo: createOrganisationRepository(supabase),
    argumentRepo: createArgumentRepository(supabase),
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
