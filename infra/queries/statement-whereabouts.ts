import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { StatementWhereabouts } from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'

type Slugged = { slug: string }

/** A statement with the slugs of its author and of its subject */
type WhereaboutsRow = {
  id: string
  public_figures: Slugged | null
  organisations: Slugged | null
  positions: { subjects: Slugged }
}

/** A statement has exactly one author; a row with neither is not one the site can show */
function whereaboutsOf(row: WhereaboutsRow): StatementWhereabouts {
  const subjectSlug = row.positions.subjects.slug
  if (row.public_figures)
    return { author: { kind: 'public_figure', slug: row.public_figures.slug }, subjectSlug }
  if (row.organisations)
    return { author: { kind: 'organisation', slug: row.organisations.slug }, subjectSlug }
  throw new Error(`Statement ${row.id} has no author`)
}

/**
 * Where each of these statements stands, by statement id: who made it, on
 * which subject. A statement that is not found is absent from the result.
 */
export function statementWhereabouts(
  supabase: SupabaseClient,
  statementIds: string[],
): Effect.Effect<Map<string, StatementWhereabouts>, DatabaseError> {
  if (statementIds.length === 0) return Effect.succeed(new Map())

  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase
        .from('statements')
        .select(
          'id, public_figures (slug), organisations (slug), positions!inner (subjects!inner (slug))',
        )
        .in('id', statementIds)
        .is('deleted_at', null)
        .is('positions.deleted_at', null)
        .is('positions.subjects.deleted_at', null)

      if (error) throw error

      return new Map(
        (data as unknown as WhereaboutsRow[]).map((row) => [row.id, whereaboutsOf(row)] as const),
      )
    },
    catch: (error) => {
      const msg = `Failed to find where statements stand: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      Sentry.captureException(error, { extra: { statementIds } })
      return new DatabaseError(msg)
    },
  })
}
