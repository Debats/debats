'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { getAdminContributor } from './admin-guard'
import type { ActionResult } from './validate-draft-action'

export async function deleteDraftAction(draftId: string): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(Effect.either(draftRepo.deleteById(draftId)))

  if (result._tag === 'Left') {
    return { success: false, error: 'Erreur lors de la suppression du brouillon.' }
  }

  return { success: true }
}
