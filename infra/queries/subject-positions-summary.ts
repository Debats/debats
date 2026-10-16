import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  PositionLatestStatement,
  PositionSummary,
} from '../../domain/read-models/subject-positions-summary'
import { StatementAuthorRef } from '../../domain/read-models/statement-author'
import { ArgumentRef } from '../../domain/read-models/argument'
import { parseStatementType, StatementAuthorKind } from '../../domain/entities/statement'
import { DatabaseError } from '../../domain/repositories/errors'

interface LatestStatementRow {
  id: string
  quote: string
  stated_at: string
  source_name: string
  source_url: string | null
  statement_type: string
  author: StatementAuthorRef
  arguments: ArgumentRef[] | null
}

function toLatestStatement(row: LatestStatementRow | null): PositionLatestStatement | null {
  if (!row) return null
  return {
    id: row.id,
    quote: row.quote,
    statedAt: new Date(row.stated_at),
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    statementType: parseStatementType(row.statement_type),
    author: row.author,
    arguments: row.arguments ?? [],
  }
}

export interface SubjectPositionsOptions {
  /** How many authors of each kind to list per position */
  authorsLimit?: number
  /** Restrict counts, lists and featured statements to one kind of author */
  authorKind?: StatementAuthorKind
}

export function getSubjectPositionsSummary(
  supabase: SupabaseClient,
  subjectId: string,
  { authorsLimit = 20, authorKind }: SubjectPositionsOptions = {},
): Effect.Effect<PositionSummary[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_subject_positions_summary', {
        p_subject_id: subjectId,
        p_authors_limit: authorsLimit,
        p_author_kind: authorKind ?? null,
      })

      if (error) throw error

      return (data as Record<string, unknown>[]).map((row) => ({
        positionId: row.position_id as string,
        positionTitle: row.position_title as string,
        positionSlug: row.position_slug as string,
        positionDescription: row.position_description as string,
        totalFiguresCount: Number(row.total_figures_count),
        totalOrganisationsCount: Number(row.total_organisations_count),
        figures: (row.figures as StatementAuthorRef[]) ?? [],
        organisations: (row.organisations as StatementAuthorRef[]) ?? [],
        latestStatement: toLatestStatement((row.latest_statement as LatestStatementRow) ?? null),
      }))
    },
    catch: (error) => {
      const msg = `Failed to fetch subject positions summary: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      Sentry.captureException(error, { extra: { subjectId, authorKind } })
      return new DatabaseError(msg)
    },
  })
}
