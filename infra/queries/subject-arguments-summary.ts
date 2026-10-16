import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ArgumentPositionCount, SubjectArgumentSummary } from '../../domain/read-models/argument'
import { StatementAuthorRef } from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'

/** The arguments of a subject with their usage, most mobilised first */
export function getSubjectArgumentsSummary(
  supabase: SupabaseClient,
  subjectId: string,
  authorsLimit = 8,
): Effect.Effect<SubjectArgumentSummary[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_subject_arguments_summary', {
        p_subject_id: subjectId,
        p_authors_limit: authorsLimit,
      })

      if (error) throw error

      return (data as Record<string, unknown>[]).map((row) => ({
        id: row.argument_id as string,
        title: row.title as string,
        description: row.description as string,
        statementsCount: Number(row.statements_count),
        positions: (row.positions as ArgumentPositionCount[]) ?? [],
        totalAuthorsCount: Number(row.total_authors_count),
        authors: (row.authors as StatementAuthorRef[]) ?? [],
      }))
    },
    catch: (error) => {
      const msg = `Failed to fetch subject arguments summary: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      Sentry.captureException(error, { extra: { subjectId } })
      return new DatabaseError(msg)
    },
  })
}
