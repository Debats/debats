import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ReviewedEntityType } from '../../domain/aggregates/review-events'
import { ReviewedEntityRepository } from '../../domain/repositories/reviewed-entity-repository'
import { databaseError } from './database-error'

/** The table each kind of reviewed entity lives in; all six sign their rows and delete softly */
const TABLE_OF: Record<ReviewedEntityType, string> = {
  statement: 'statements',
  subject: 'subjects',
  public_figure: 'public_figures',
  organisation: 'organisations',
  position: 'positions',
  argument: 'arguments',
}

export function createReviewedEntityRepository(supabase: SupabaseClient): ReviewedEntityRepository {
  return {
    findOrigin: (entity) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from(TABLE_OF[entity.type])
            .select('created_by')
            .eq('id', entity.id)
            .is('deleted_at', null)
            .maybeSingle()

          if (error) throw error
          return data ? { addedBy: (data.created_by as string | null) ?? null } : null
        },
        catch: (error) => databaseError(`Failed to find who added the ${entity.type}`, error),
      }),
  }
}
