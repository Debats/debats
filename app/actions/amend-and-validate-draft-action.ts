'use server'

import { Effect, Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { runLive } from '../../infra/live-services'
import { validateDraft } from '../../domain/use-cases/validate-draft'
import { DraftAuthor } from '../../domain/entities/draft-statement'
import { getAdminContributor } from './admin-guard'
import type { ActionResult } from './validate-draft-action'

export type DraftAmendments = {
  author?: DraftAuthor
  subjectTitle?: string
  positionTitle?: string
  sourceName?: string
  quote?: string
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
    if (updateResult.right === null) {
      return { success: false, error: 'Brouillon introuvable.' }
    }
  }

  const result = await runLive(validateDraft({ draftId, contributor }), supabase)

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
