import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../../domain/entities/subject'
import { SubjectStats } from '../../domain/value-objects/subject-stats'
import { DatabaseError } from '../../domain/repositories/errors'
import {
  SubjectActivitySummary,
  SubjectRepository,
} from '../../domain/repositories/subject-repository'
import { Database } from '../../types/database.types'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

type SubjectRow = Database['public']['Tables']['subjects']['Row']

const mapRowToEntity = (row: SubjectRow) =>
  Subject.make({
    id: SubjectId.make(row.id),
    title: SubjectTitle.make(row.title),
    slug: SubjectSlug.make(row.slug),
    presentation: row.presentation,
    problem: row.problem,
    pictureUrl: row.picture_url ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at!),
    updatedAt: new Date(row.updated_at!),
  })

const mapEntityToInsert = (subject: Subject) => ({
  id: subject.id,
  title: subject.title,
  slug: subject.slug,
  presentation: subject.presentation,
  problem: subject.problem,
  picture_url: subject.pictureUrl ?? null,
  created_by: subject.createdBy ?? null,
  created_at: subject.createdAt.toISOString(),
  updated_at: subject.updatedAt.toISOString(),
})

export function createSubjectRepository(supabase: SupabaseClient): SubjectRepository {
  return {
    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error
          return data.map(mapRowToEntity)
        },
        catch: (error) => dbError('Failed to fetch subjects', error),
      }),

    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }
          return mapRowToEntity(data)
        },
        catch: (error) => dbError('Failed to fetch subject', error),
      }),

    findBySlug: (slug: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('slug', slug)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }
          return mapRowToEntity(data)
        },
        catch: (error) => dbError('Failed to fetch subject', error),
      }),

    create: (subject: Subject) =>
      Effect.tryPromise({
        try: async () => {
          const row = mapEntityToInsert(subject)
          const { data, error } = await supabase.from('subjects').insert(row).select().single()

          if (error) throw error
          return mapRowToEntity(data)
        },
        catch: (error) => dbError('Failed to create subject', error),
      }),

    update: (subject: Subject) =>
      Effect.tryPromise({
        try: async () => {
          const row = mapEntityToInsert(subject)
          const { data, error } = await supabase
            .from('subjects')
            .update(row)
            .eq('id', subject.id)
            .select()
            .single()

          if (error) throw error
          return mapRowToEntity(data)
        },
        catch: (error) => dbError('Failed to update subject', error),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('subjects').delete().eq('id', id)

          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete subject', error),
      }),

    getStats: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { count: positionsCount, error: positionsError } = await supabase
            .from('positions')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', subjectId)

          if (positionsError) throw positionsError

          const { data: publicFiguresData, error: figuresError } = await supabase
            .from('statements')
            .select(
              `
            public_figure_id,
            positions!inner(subject_id)
          `,
            )
            .eq('positions.subject_id', subjectId)

          if (figuresError) throw figuresError

          const uniquePublicFigures = new Set(publicFiguresData.map((s) => s.public_figure_id))
          const publicFiguresCount = uniquePublicFigures.size

          const { count: statementsCount, error: statementsError } = await supabase
            .from('statements')
            .select('*, positions!inner(subject_id)', { count: 'exact', head: true })
            .eq('positions.subject_id', subjectId)

          if (statementsError) throw statementsError

          return SubjectStats.make({
            subjectId,
            positionsCount: positionsCount || 0,
            publicFiguresCount,
            statementsCount: statementsCount || 0,
          })
        },
        catch: (error) => dbError('Failed to get stats', error),
      }),

    findSummariesByActivity: (limit: number) =>
      fetchSummaries(supabase, 'latest_statement_at', limit),

    findSummariesByCreatedAt: (limit: number) => fetchSummaries(supabase, 'created_at', limit),

    findSummaryById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('v_subject_activity_summary')
            .select('*')
            .eq('id', id)
            .maybeSingle()

          if (error) throw error
          if (!data) return null

          return mapSummaryRow(data)
        },
        catch: (error) => dbError('Failed to fetch subject summary by id', error),
      }),

    findAllIds: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase.from('subjects').select('id').order('id')

          if (error) throw error
          return data.map((row) => row.id)
        },
        catch: (error) => dbError('Failed to fetch subject ids', error),
      }),
  }
}

function mapSummaryRow(row: Record<string, unknown>): SubjectActivitySummary {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    presentation: row.presentation as string,
    problem: row.problem as string,
    pictureUrl: (row.picture_url as string) ?? undefined,
    createdAt: new Date(row.created_at as string),
    latestStatementAt: row.latest_statement_at ? new Date(row.latest_statement_at as string) : null,
    positionsCount: (row.positions_count as number) ?? 0,
    statementsCount: (row.statements_count as number) ?? 0,
    publicFiguresCount: (row.public_figures_count as number) ?? 0,
    figures: Array.isArray(row.figures)
      ? (row.figures as Array<{ id: string; name: string; slug: string }>)
      : [],
  }
}

function fetchSummaries(
  supabase: SupabaseClient,
  orderBy: string,
  limit: number,
): Effect.Effect<SubjectActivitySummary[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase
        .from('v_subject_activity_summary')
        .select('*')
        .order(orderBy, { ascending: false, nullsFirst: false })
        .limit(limit)

      if (error) throw error
      return data.map(mapSummaryRow)
    },
    catch: (error) => dbError('Failed to fetch subject summaries', error),
  })
}
