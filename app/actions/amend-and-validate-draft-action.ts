'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { runLive } from '../../infra/live-services'
import { validateDraft } from '../../domain/use-cases/validate-draft'
import { getAdminContributor } from './admin-guard'
import { applyAmendments, DraftAmendments } from './draft-amendments'
import type { ActionResult } from './validate-draft-action'

export type { DraftAmendments } from './draft-amendments'

export async function amendAndValidateDraftAction(
  draftId: string,
  amendments: DraftAmendments,
): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  const supabase = createAdminSupabaseClient()
  const amended = await applyAmendments(
    createDraftStatementRepository(supabase),
    draftId,
    amendments,
  )
  if (!amended.success) return amended

  const result = await runLive(validateDraft({ draftId, contributor }), supabase)

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
