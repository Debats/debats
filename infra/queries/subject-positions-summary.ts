import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { PositionSummary } from '../../domain/read-models/subject-positions-summary'
import { DatabaseError } from '../../domain/repositories/errors'

export function getSubjectPositionsSummary(
  supabase: SupabaseClient,
  subjectId: string,
  figuresLimit = 20,
): Effect.Effect<PositionSummary[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_subject_positions_summary', {
        p_subject_id: subjectId,
        p_figures_limit: figuresLimit,
      })

      if (error) throw error

      return (data as Record<string, unknown>[]).map((row) => ({
        positionId: row.position_id as string,
        positionTitle: row.position_title as string,
        positionDescription: row.position_description as string,
        totalFiguresCount: Number(row.total_figures_count),
        figures: (row.figures as Array<{ id: string; name: string; slug: string }>) ?? [],
      }))
    },
    catch: (error) => {
      const msg = `Failed to fetch subject positions summary: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      Sentry.captureException(error, { extra: { subjectId } })
      return new DatabaseError(msg)
    },
  })
}
