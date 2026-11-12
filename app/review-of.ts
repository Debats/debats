import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ReviewScopeValue } from '../components/review/review-scope'
import { viewerOf } from '../domain/read-models/review'
import { loadReviewMarks } from '../infra/queries/review'

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
