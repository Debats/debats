'use server'

import { rejectDraftAction, requestRevisionAction } from './reject-draft-action'
import { ActionResult, validateDraftAction } from './validate-draft-action'

/**
 * What became of the drafts of a joint declaration reviewed as one: how many
 * were settled, and the one that stopped the review, when one did. The
 * drafts settled before it stay settled: each is its own command.
 */
export type DeclarationReviewResult =
  | { success: true; settled: number }
  | { success: false; settled: number; stoppedAt: string; error: string }

/** One draft after the other, stopping at the first that is refused */
async function each(
  draftIds: string[],
  review: (draftId: string) => Promise<ActionResult>,
): Promise<DeclarationReviewResult> {
  let settled = 0
  for (const draftId of draftIds) {
    const result = await review(draftId)
    if (!result.success) return { success: false, settled, stoppedAt: draftId, error: result.error }
    settled += 1
  }
  return { success: true, settled }
}

/**
 * Validates every draft of a joint declaration, in one gesture. The order
 * does not matter: each draft teaches the site what it lacks of the text —
 * the text, a position it takes, a signatory — and they converge.
 */
export async function validateDraftedDeclarationAction(
  draftIds: string[],
): Promise<DeclarationReviewResult> {
  return each(draftIds, validateDraftAction)
}

/** Rejects every draft of a joint declaration, for the same reason */
export async function rejectDraftedDeclarationAction(
  draftIds: string[],
  note: string,
): Promise<DeclarationReviewResult> {
  return each(draftIds, (draftId) => rejectDraftAction(draftId, note))
}

/** Sends every draft of a joint declaration back to be revised, with the same request */
export async function sendBackDraftedDeclarationAction(
  draftIds: string[],
  note: string,
): Promise<DeclarationReviewResult> {
  return each(draftIds, (draftId) => requestRevisionAction(draftId, note))
}
