import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import { Database } from '../../types/database.types'

type Step = { slug: string; deleted_at: string | null; merged_into_id: string | null }

const STEP = 'slug, deleted_at, merged_into_id'

/** More merges in a row than any subject will ever know: the walk ends even on broken data */
const MAX_MERGES = 20

/** A subject by its slug or its id, deleted or not; both are unique */
async function subjectWhere(
  supabase: SupabaseClient<Database>,
  column: 'slug' | 'id',
  value: string,
): Promise<Step | null> {
  const { data, error } = await supabase
    .from('subjects')
    .select(STEP)
    .eq(column, value)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * The slug of the live subject an old address now leads to: the subject at
 * `slug` was merged into another, which may itself have been merged since.
 * Null when the address was never a subject, when the subject is live (it
 * needs no successor), or when the trail ends on a subject simply deleted.
 */
export function findSubjectSuccessorSlug(
  supabase: SupabaseClient<Database>,
  slug: string,
): Effect.Effect<string | null, DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      let step = await subjectWhere(supabase, 'slug', slug)
      if (!step || step.deleted_at === null) return null

      for (let merges = 0; step?.merged_into_id && merges < MAX_MERGES; merges++) {
        step = await subjectWhere(supabase, 'id', step.merged_into_id)
        if (step && step.deleted_at === null) return step.slug
      }
      return null
    },
    catch: (error) => {
      Sentry.captureException(error, { extra: { slug } })
      return new DatabaseError(
        `Failed to find where the subject ${slug} went: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      )
    },
  })
}
