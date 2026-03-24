'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { getAdminContributor } from './admin-guard'
import type { ActionResult } from './validate-draft-action'

async function changeDraftStatus(
  draftId: string,
  note: string,
  status: 'rejected' | 'revision_requested',
  errorMessage: string,
): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  if (!note.trim()) {
    return { success: false, error: 'La note est obligatoire.' }
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)

  const result = await Effect.runPromise(
    Effect.either(draftRepo.updateStatus(draftId, status, note.trim())),
  )

  if (result._tag === 'Left') {
    return { success: false, error: errorMessage }
  }

  return { success: true }
}

export async function rejectDraftAction(draftId: string, note: string): Promise<ActionResult> {
  return changeDraftStatus(draftId, note, 'rejected', 'Erreur lors du rejet du brouillon.')
}

export async function requestRevisionAction(draftId: string, note: string): Promise<ActionResult> {
  return changeDraftStatus(
    draftId,
    note,
    'revision_requested',
    'Erreur lors de la demande de révision.',
  )
}
