'use server'

import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { getAdminContributor } from './admin-guard'
import { applyAmendments, DraftAmendments } from './draft-amendments'
import type { ActionResult } from './validate-draft-action'

/** Keeps the amended draft for later: it stays pending, nothing is validated */
export async function amendDraftAction(
  draftId: string,
  amendments: DraftAmendments,
): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  return applyAmendments(
    createDraftStatementRepository(createAdminSupabaseClient()),
    draftId,
    amendments,
  )
}
