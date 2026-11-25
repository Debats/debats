import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { JudgedPair } from '../../domain/read-models/position-judgements'
import { DatabaseError } from '../../domain/repositories/errors'
import { Database } from '../../types/database.types'
import { databaseError } from '../database/database-error'
import { fetchAllRows } from '../database/fetch-all-pages'

/**
 * Everything that was judged between two positions, across the site: what an
 * analysis of every subject reads, where naming the subjects one by one would
 * name them all. Pairs are judged by hand, a few per subject at most.
 */
export function findAllJudgedPairs(
  supabase: SupabaseClient<Database>,
): Effect.Effect<JudgedPair[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await fetchAllRows((offset, limit) =>
        supabase
          .from('position_judgements')
          .select('position_id_1, position_id_2, compatible', { count: 'exact' })
          .order('position_id_1')
          .order('position_id_2')
          .range(offset, offset + limit - 1),
      )
      return rows.map((row) => ({
        positionIds: [row.position_id_1, row.position_id_2] as const,
        compatible: row.compatible,
      }))
    },
    catch: (error) => databaseError('Failed to read what was judged of the positions', error),
  })
}

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
