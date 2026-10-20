import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Argument, ArgumentId, ArgumentSlug, ArgumentTitle } from '../../domain/entities/argument'
import { ArgumentRef, ArgumentSuggestion, ArgumentSummary } from '../../domain/read-models/argument'
import { DatabaseError } from '../../domain/repositories/errors'
import { ArgumentRepository } from '../../domain/repositories/argument-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

interface ArgumentRow {
  id: string
  title: string
  slug: string
  description: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

interface SummaryRow {
  id: string
  title: string
  slug: string
  description: string
  statements_count: number | null
  subjects_count: number | null
}

function mapRow(row: ArgumentRow): Argument {
  return Argument.make({
    id: ArgumentId.make(row.id),
    title: ArgumentTitle.make(row.title),
    slug: ArgumentSlug.make(row.slug),
    description: row.description,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

const mapSummary = (row: SummaryRow): ArgumentSummary => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description,
  statementsCount: row.statements_count ?? 0,
  subjectsCount: row.subjects_count ?? 0,
})

export function createArgumentRepository(supabase: SupabaseClient): ArgumentRepository {
  const live = () => supabase.from('arguments').select('*').is('deleted_at', null)

  const findOne = (
    apply: (q: ReturnType<typeof live>) => ReturnType<typeof live>,
    message: string,
  ) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await apply(live()).maybeSingle()
        if (error) throw error
        return data ? mapRow(data) : null
      },
      catch: (error) => dbError(message, error),
    })

  return {
    findById: (id) => findOne((q) => q.eq('id', id), 'Failed to fetch argument'),

    findBySlug: (slug) => findOne((q) => q.eq('slug', slug), 'Failed to fetch argument by slug'),

    findByTitle: (title) =>
      findOne((q) => q.ilike('title', title.trim()), 'Failed to fetch argument by title'),

    findByIds: (ids) =>
      Effect.tryPromise({
        try: async () => {
          if (ids.length === 0) return []
          const { data, error } = await live().in('id', ids)
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch arguments by ids', error),
      }),

    search: (query, limit = 8) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('v_argument_summary')
            .select('*')
            .ilike('title', `%${query.trim()}%`)
            .order('statements_count', { ascending: false })
            .order('title')
            .limit(limit)
          if (error) throw error
          return (data as SummaryRow[]).map(
            (row): ArgumentSuggestion => ({
              id: row.id,
              title: row.title,
              slug: row.slug,
              statementsCount: row.statements_count ?? 0,
            }),
          )
        },
        catch: (error) => dbError('Failed to search arguments', error),
      }),

    findSummaries: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('v_argument_summary')
            .select('*')
            .order('statements_count', { ascending: false })
            .order('title')
          if (error) throw error
          return (data as SummaryRow[]).map(mapSummary)
        },
        catch: (error) => dbError('Failed to fetch argument summaries', error),
      }),

    findRefsByStatementId: (statementId) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('argument_statements')
            .select('arguments!inner (id, title, slug, deleted_at)')
            .eq('statement_id', statementId)
            .is('arguments.deleted_at', null)
          if (error) throw error
          return (data as unknown as Array<{ arguments: ArgumentRef }>)
            .map(
              (row): ArgumentRef => ({
                id: row.arguments.id,
                title: row.arguments.title,
                slug: row.arguments.slug,
              }),
            )
            .sort((a, b) => a.title.localeCompare(b.title, 'fr'))
        },
        catch: (error) => dbError('Failed to fetch statement arguments', error),
      }),
  }
}
