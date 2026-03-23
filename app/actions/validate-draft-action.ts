'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { createWikipediaValidator } from '../../infra/wikipedia/wikipedia-validator'
import { validateDraft } from '../../domain/use-cases/validate-draft'
import { getAdminContributor } from './admin-guard'

export type ActionResult = { success: true } | { success: false; error: string }

export async function validateDraftAction(draftId: string): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  const supabase = createAdminSupabaseClient()

  const result = await validateDraft({
    draftId,
    contributor: { id: contributor.id, reputation: contributor.reputation },
    draftRepo: createDraftStatementRepository(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
    subjectRepo: createSubjectRepository(supabase),
    positionRepo: createPositionRepository(supabase),
    statementRepo: createStatementRepository(supabase),
    reputationRepo: createReputationRepository(supabase),
    wikipediaValidator: createWikipediaValidator(),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
