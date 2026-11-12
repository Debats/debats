import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { reviewToSpeakOf } from '../components/review/ReviewOnEdit/review-choice'
import { ReviewScopeValue } from '../components/review/review-scope'
import { ReviewedEntity } from '../domain/aggregates/review'
import { ReviewDetail, viewerOf } from '../domain/read-models/review'
import { loadReviewDetail, loadReviewMarks } from '../infra/queries/review'

/**
 * What a page hands its `ReviewScope`: the marks of the entities it shows,
 * read in one query, and who looks at them — the contributor the page
 * already knows, or null for a visitor, who gets the same marks as
 * everyone: reviews are shown signed in or not.
 */
export async function reviewOf(
  supabase: SupabaseClient,
  contributor: { id: string; reputation: number } | null,
  entityIds: readonly string[],
): Promise<ReviewScopeValue> {
  const marks = await Effect.runPromise(
    loadReviewMarks(supabase, entityIds, contributor?.id ?? null),
  )
  return { marks, viewer: viewerOf(contributor) }
}

/**
 * What an edit page hands its form of the entity's review: who confirmed it
 * and which flags are open, for the editor to say what her edit makes of
 * them. Null for an entity nobody confirmed or flagged: the form then has
 * nothing to ask.
 */
export async function reviewToEdit(
  supabase: SupabaseClient,
  entity: ReviewedEntity,
  editorId: string,
): Promise<ReviewDetail | null> {
  return reviewToSpeakOf(await Effect.runPromise(loadReviewDetail(supabase, entity, editorId)))
}
