'use server'

import { Either } from 'effect'
import { runLive } from '../../infra/live-services'
import { validateDraft } from '../../domain/use-cases/validate-draft'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true } | { success: false; error: string }

export async function validateDraftAction(draftId: string): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(validateDraft({ draftId, contributor }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
