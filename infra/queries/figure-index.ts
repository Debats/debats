import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { quoteOf } from '../../domain/entities/statement'
import { FigureIndexEntry } from '../../domain/read-models/figure-index'
import { FigureSpotlight, figureSpotlight } from '../../domain/read-models/figure-spotlight'
import { DatabaseError } from '../../domain/repositories/errors'
import { fetchAllRows } from '../database/fetch-all-pages'
import { createStatementRepository } from '../database/statement-repository-supabase'

const INDEX_VIEW = 'v_public_figure_index_summary'

/** A row of `v_public_figure_index_summary` */
export interface FigureIndexRow {
  id: string
  name: string
  slug: string
  presentation: string
  statements_count: number
  subjects_count: number
  latest_statement_at: string | null
  occupations: {
    name: string
    is_current: boolean
    family_id: string
    family_name: string
    family_slug: string
    family_position: number
  }[]
  affiliations: { name: string; acronym: string | null; slug: string; ended_on: string | null }[]
}

export function toFigureIndexEntry(row: FigureIndexRow): FigureIndexEntry {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    presentation: row.presentation,
    statementsCount: row.statements_count,
    subjectsCount: row.subjects_count,
    latestStatementAt: row.latest_statement_at ? new Date(row.latest_statement_at) : null,
    occupations: row.occupations.map((occupation) => ({
      name: occupation.name,
      isCurrent: occupation.is_current,
      family: {
        id: occupation.family_id,
        name: occupation.family_name,
        slug: occupation.family_slug,
        position: occupation.family_position,
      },
    })),
    affiliations: row.affiliations.map(({ ended_on, ...organisation }) => ({
      organisation,
      endedOn: Option.map(Option.fromNullable(ended_on), (day) => new Date(day)),
    })),
  }
}

function dbError(message: string, error: unknown): DatabaseError {
  const detail = error instanceof Error ? error.message : JSON.stringify(error)
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(`${message}: ${detail}`)
}

/** Every living figure with her activity, occupations and affiliations: the whole index in one read */
export function loadFigureIndex(
  supabase: SupabaseClient,
): Effect.Effect<FigureIndexEntry[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await fetchAllRows<FigureIndexRow>((offset, limit) =>
        supabase
          .from(INDEX_VIEW)
          .select('*', { count: 'exact' })
          .order('name')
          .range(offset, offset + limit - 1),
      )
      return rows.map(toFigureIndexEntry)
    },
    catch: (error) => dbError('Failed to fetch the figures index', error),
  })
}

const findIndexEntryBySlug = (
  supabase: SupabaseClient,
  slug: string,
): Effect.Effect<FigureIndexEntry | null, DatabaseError> =>
  Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.from(INDEX_VIEW).select('*').eq('slug', slug).limit(1)
      if (error) throw error
      const [row] = data as FigureIndexRow[]
      return row ? toFigureIndexEntry(row) : null
    },
    catch: (error) => dbError('Failed to fetch a figure of the index', error),
  })

/** One figure put forward on the index, with her latest statements; null when the slug names nobody */
export function loadFigureSpotlight(
  supabase: SupabaseClient,
  slug: string,
  today: Date,
): Effect.Effect<FigureSpotlight | null, DatabaseError> {
  return findIndexEntryBySlug(supabase, slug).pipe(
    Effect.flatMap((entry) =>
      entry === null
        ? Effect.succeed(null)
        : createStatementRepository(supabase)
            .findByPublicFigureWithDetails(entry.id)
            .pipe(
              Effect.map((statements) =>
                figureSpotlight(
                  entry,
                  statements.map(({ statement, position, subject }) => ({
                    statedAt: statement.statedAt,
                    quote: quoteOf(statement.content),
                    sourceName: statement.sourceName,
                    subject: { title: subject.title, slug: subject.slug },
                    positionTitle: position.title,
                  })),
                  today,
                ),
              ),
            ),
    ),
  )
}
