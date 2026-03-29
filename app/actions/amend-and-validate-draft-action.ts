'use server'

import { Effect, Either } from 'effect'
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
import type { ActionResult } from './validate-draft-action'

export type DraftAmendments = {
  publicFigureName?: string
  subjectTitle?: string
  positionTitle?: string
  sourceName?: string
  quote?: string
  publicFigureData?: {
    presentation: string
    wikipediaUrl?: string
    notorietySources?: string[]
  } | null
  subjectData?: { presentation: string; problem: string } | null
  positionData?: { description: string } | null
}

export async function amendAndValidateDraftAction(
  draftId: string,
  amendments: DraftAmendments,
): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const fields = Object.fromEntries(Object.entries(amendments).filter(([, v]) => v !== undefined))

  if (Object.keys(fields).length > 0) {
    const updateResult = await Effect.runPromise(Effect.either(draftRepo.update(draftId, fields)))
    if (updateResult._tag === 'Left') {
      return { success: false, error: 'Erreur lors de la mise à jour du brouillon.' }
    }
  }

  const result = await validateDraft({
    draftId,
    contributor: { id: contributor.id, reputation: contributor.reputation },
    draftRepo,
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
