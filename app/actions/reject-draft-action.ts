'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { getAdminContributor } from './admin-guard'
import type { ActionResult } from './validate-draft-action'

export async function rejectDraftAction(draftId: string, note: string): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  if (!note.trim()) {
    return { success: false, error: 'La note de rejet est obligatoire.' }
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(
    Effect.either(draftRepo.updateStatus(draftId, 'rejected', note.trim())),
  )

  if (result._tag === 'Left') {
    return { success: false, error: 'Erreur lors du rejet du brouillon.' }
  }

  return { success: true }
}
