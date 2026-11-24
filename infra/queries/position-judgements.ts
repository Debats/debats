import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { JudgedPair } from '../../domain/read-models/position-judgements'
import { DatabaseError } from '../../domain/repositories/errors'
import { Database } from '../../types/database.types'

/**
 * What was judged between the positions of these subjects. Both positions of
 * a pair belong to one subject, so the subject of the first tells the pair's.
 * Asked by subject and not by position: a page that compares an author with
 * everyone on her subjects would name hundreds of positions.
 */
export function findJudgedPairs(
  supabase: SupabaseClient<Database>,
  subjectIds: readonly string[],
): Effect.Effect<JudgedPair[], DatabaseError> {
  const ids = Array.from(new Set(subjectIds))
  if (ids.length === 0) return Effect.succeed([])
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase
        .from('position_judgements')
        .select(
          'position_id_1, position_id_2, compatible, first:positions!position_judgements_position_id_1_fkey!inner(subject_id)',
        )
        .in('first.subject_id', ids)
      if (error) throw error
      return data.map((row) => ({
        positionIds: [row.position_id_1, row.position_id_2] as const,
        compatible: row.compatible,
      }))
    },
    catch: (error) => {
      Sentry.captureException(error)
      return new DatabaseError(
        `Failed to read what was judged of the positions: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      )
    },
  })
}
