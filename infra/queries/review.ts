import { Effect, pipe } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ReviewedEntity } from '../../domain/aggregates/review'
import { ReviewDetail, ReviewMarks } from '../../domain/read-models/review'
import { DatabaseError } from '../../domain/repositories/errors'
import { databaseError } from '../database/database-error'
import { createReviewedEntityRepository } from '../database/reviewed-entity-repository-supabase'
import { displayNames } from './display-names'
import { loadOpenFlagsOf } from './flag-queue'

/** How many of the last readers who confirmed are named in the detail */
const NAMED_CONFIRMERS = 3

/**
 * The marks of the entities of a page, in one read: how many readers
 * confirmed each, how many flags are open on it, and what the viewer did
 * herself (`get_review_marks`). An entity nobody reviewed has no entry.
 */
export function loadReviewMarks(
  supabase: SupabaseClient,
  entityIds: readonly string[],
  viewerId: string | null,
): Effect.Effect<ReviewMarks, DatabaseError> {
  if (entityIds.length === 0) return Effect.succeed({})
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_review_marks', {
        p_entity_ids: [...entityIds],
        ...(viewerId ? { p_viewer: viewerId } : {}),
      })

      if (error) throw error

      return Object.fromEntries(
        (data as Record<string, unknown>[]).map((row) => [
          row.entity_id as string,
          {
            confirmations: row.confirmations as number,
            openFlags: row.open_flags as number,
            confirmedByViewer: row.confirmed_by_viewer as boolean,
            flaggedByViewer: row.flagged_by_viewer as boolean,
          },
        ]),
      )
    },
    catch: (error) => databaseError('Failed to load the review marks', error),
  })
}

interface ConfirmationRow {
  created_by: string
  created_at: string
}

const lastConfirmations = (supabase: SupabaseClient, entityId: string) =>
  Effect.tryPromise({
    try: async () => {
      const { data, count, error } = await supabase
        .from('confirmations')
        .select('created_by, created_at', { count: 'exact' })
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(NAMED_CONFIRMERS)

      if (error) throw error
      return { last: data as ConfirmationRow[], total: count ?? 0 }
    },
    catch: (error) => databaseError('Failed to load the confirmations', error),
  })

/**
 * What the mark opens on: who confirmed the entity, which flags are open
 * and what they say, and whether the viewer added the entity herself.
 */
export function loadReviewDetail(
  supabase: SupabaseClient,
  entity: ReviewedEntity,
  viewerId: string | null,
): Effect.Effect<ReviewDetail, DatabaseError> {
  return pipe(
    Effect.all({
      confirmations: lastConfirmations(supabase, entity.id),
      flags: loadOpenFlagsOf(supabase, entity),
      origin: createReviewedEntityRepository(supabase).findOrigin(entity),
    }),
    Effect.bind('names', ({ confirmations }) =>
      displayNames(
        supabase,
        confirmations.last.map((row) => row.created_by),
      ),
    ),
    Effect.map(({ confirmations, flags, origin, names }) => ({
      confirmations: confirmations.total,
      confirmers: confirmations.last.flatMap((row) => names.get(row.created_by) ?? []),
      lastConfirmedAt: confirmations.last[0] ? new Date(confirmations.last[0].created_at) : null,
      flags,
      addedByViewer: viewerId !== null && origin?.addedBy === viewerId,
    })),
  )
}
