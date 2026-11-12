import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import { databaseError } from '../database/database-error'

/**
 * The names the site shows contributors under (« Prénom N. »), by
 * contributor id (`contributor_display_names`); none for who gave no name.
 */
export function displayNames(
  supabase: SupabaseClient,
  contributorIds: readonly string[],
): Effect.Effect<Map<string, string>, DatabaseError> {
  if (contributorIds.length === 0) return Effect.succeed(new Map())
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('contributor_display_names', {
        p_ids: Array.from(new Set(contributorIds)),
      })

      if (error) throw error

      return new Map(
        (data as { id: string; display_name: string | null }[]).flatMap((row) =>
          row.display_name ? [[row.id, row.display_name] as const] : [],
        ),
      )
    },
    catch: (error) => databaseError('Failed to load the names of the contributors', error),
  })
}
