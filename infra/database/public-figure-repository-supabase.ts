import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../../domain/entities/public-figure'
import { PublicFigureActivitySummary } from '../../domain/value-objects/public-figure-activity-summary'
import {
  DatabaseError,
  PublicFigureRepository,
} from '../../domain/repositories/public-figure-repository'
import { fetchAllRows } from './fetch-all-pages'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

interface PublicFigureRow {
  id: string
  name: string
  slug: string
  presentation: string
  website_url: string | null
  wikipedia_url: string | null
  notoriety_sources: string[] | null
  created_at: string
  updated_at: string
  created_by: string
}

function mapRow(row: PublicFigureRow): PublicFigure {
  return PublicFigure.make({
    id: PublicFigureId.make(row.id),
    name: PublicFigureName.make(row.name),
    slug: PublicFigureSlug.make(row.slug),
    presentation: row.presentation,
    websiteUrl: Option.fromNullable(row.website_url),
    wikipediaUrl: Option.fromNullable(row.wikipedia_url),
    notorietySources: row.notoriety_sources ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by,
  })
}

interface ActivitySummaryRow {
  id: string
  name: string
  slug: string
  presentation: string
  statements_count: number | null
  subjects_count: number | null
  latest_statement_at: string | null
}

function mapSummaryRow(row: ActivitySummaryRow): PublicFigureActivitySummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    presentation: row.presentation,
    statementsCount: row.statements_count ?? 0,
    subjectsCount: row.subjects_count ?? 0,
    latestStatementAt: row.latest_statement_at ? new Date(row.latest_statement_at) : null,
  }
}

/** PostgREST reports a missing row on `.single()` with this code. */
const NO_ROW_FOUND = 'PGRST116'

export function createPublicFigureRepository(supabase: SupabaseClient): PublicFigureRepository {
  /** Reads one figure, or null when the filter matches nothing. */
  const findOneBy = (column: string, value: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await supabase
          .from('public_figures')
          .select('*')
          .eq(column, value)
          .is('deleted_at', null)
          .single()

        if (error) {
          if (error.code === NO_ROW_FOUND) return null
          throw error
        }

        return mapRow(data)
      },
      catch: (error) => dbError(`Failed to fetch public figure by ${column}`, error),
    })

  return {
    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          // Every figure is served, however many pages PostgREST needs: the
          // sitemap and the search would otherwise lose entries without a word.
          const rows = await fetchAllRows<PublicFigureRow>((offset, limit) =>
            supabase
              .from('public_figures')
              .select('*', { count: 'exact' })
              .is('deleted_at', null)
              .order('name')
              .range(offset, offset + limit - 1),
          )
          return rows.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch public figures', error),
      }),

    searchByName: (query: string, limit = 10) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .select('*')
            .ilike('name', `%${query}%`)
            .is('deleted_at', null)
            .order('name')
            .limit(limit)

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to search public figures', error),
      }),

    findBySlug: (slug: string) => findOneBy('slug', slug),

    findById: (id: string) => findOneBy('id', id),

    findByWikipediaUrl: (url: string) => findOneBy('wikipedia_url', url),

    create: (publicFigure: PublicFigure) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .insert({
              id: publicFigure.id,
              name: publicFigure.name,
              slug: publicFigure.slug,
              presentation: publicFigure.presentation,
              website_url: Option.getOrNull(publicFigure.websiteUrl),
              wikipedia_url: Option.getOrNull(publicFigure.wikipediaUrl),
              notoriety_sources: publicFigure.notorietySources,
              created_by: publicFigure.createdBy,
            })
            .select()
            .single()

          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create public figure', error),
      }),

    update: (publicFigure: PublicFigure) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figures')
            .update({
              name: publicFigure.name,
              slug: publicFigure.slug,
              presentation: publicFigure.presentation,
              website_url: Option.getOrNull(publicFigure.websiteUrl),
              wikipedia_url: Option.getOrNull(publicFigure.wikipediaUrl),
              notoriety_sources: publicFigure.notorietySources,
            })
            .eq('id', publicFigure.id)
            .select()
            .single()

          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to update public figure', error),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.rpc('soft_delete_public_figure', { p_id: id })
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete public figure', error),
      }),

    getStats: (publicFigureId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { count: statementsCount, error: statementsError } = await supabase
            .from('statements')
            .select('*', { count: 'exact', head: true })
            .eq('public_figure_id', publicFigureId)
            .is('deleted_at', null)

          if (statementsError) throw statementsError

          const { data: subjectsData, error: subjectsError } = await supabase
            .from('statements')
            .select(
              `
            position_id,
            positions(subject_id)
          `,
            )
            .eq('public_figure_id', publicFigureId)
            .is('deleted_at', null)

          if (subjectsError) throw subjectsError

          const uniqueSubjects = new Set(
            subjectsData
              .filter((s) => s.positions)
              .map((s) => (s.positions as unknown as { subject_id: string }).subject_id),
          )
          const subjectsCount = uniqueSubjects.size

          return {
            publicFigureId,
            statementsCount: statementsCount || 0,
            subjectsCount,
          }
        },
        catch: (error) => dbError('Failed to get public figure stats', error),
      }),

    findSummariesByActivity: (limit: number, orderBy = 'latest_statement_at' as const) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('v_public_figure_activity_summary')
            .select('*')
            .order(orderBy, { ascending: false, nullsFirst: false })
            .limit(limit)

          if (error) throw error
          return data.map(mapSummaryRow)
        },
        catch: (error) => dbError('Failed to fetch public figure summaries', error),
      }),

    findByLetter: (letter: string) =>
      Effect.tryPromise({
        try: async () => {
          const rows = await fetchAllRows<ActivitySummaryRow>((offset, limit) =>
            supabase
              .from('v_public_figure_activity_summary')
              .select('*', { count: 'exact' })
              .ilike('name', `${letter}%`)
              .order('name')
              .range(offset, offset + limit - 1),
          )
          return rows.map(mapSummaryRow)
        },
        catch: (error) => dbError('Failed to fetch public figures by letter', error),
      }),
  }
}
