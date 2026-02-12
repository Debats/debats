import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../../domain/entities/subject'
import { SubjectStats } from '../../domain/value-objects/subject-stats'
import {
  DatabaseError,
  SubjectActivitySummary,
  SubjectRepository,
} from '../../domain/repositories/subject-repository'
import { Database } from '../../types/database.types'

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
        catch: (error) =>
          new DatabaseError(
            `Failed to fetch subjects: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
          ),
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
        catch: (error) => new DatabaseError(`Failed to fetch subject: ${error}`),
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
        catch: (error) => new DatabaseError(`Failed to fetch subject: ${error}`),
      }),

    create: (subject: Subject) =>
      Effect.tryPromise({
        try: async () => {
          const row = mapEntityToInsert(subject)
          const { data, error } = await supabase.from('subjects').insert(row).select().single()

          if (error) throw error
          return mapRowToEntity(data)
        },
        catch: (error) => new DatabaseError(`Failed to create subject: ${error}`),
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
        catch: (error) => new DatabaseError(`Failed to update subject: ${error}`),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('subjects').delete().eq('id', id)

          if (error) throw error
        },
        catch: (error) => new DatabaseError(`Failed to delete subject: ${error}`),
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
        catch: (error) => new DatabaseError(`Failed to get stats: ${error}`),
      }),

    findSummariesByActivity: (limit: number) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('subject_activity_summary')
            .select('*')
            .order('latest_statement_at', { ascending: false, nullsFirst: false })
            .limit(limit)

          if (error) throw error

          return data.map(
            (row): SubjectActivitySummary => ({
              id: row.id,
              title: row.title,
              slug: row.slug,
              presentation: row.presentation,
              problem: row.problem,
              pictureUrl: row.picture_url ?? undefined,
              createdAt: new Date(row.created_at!),
              latestStatementAt: row.latest_statement_at
                ? new Date(row.latest_statement_at)
                : null,
              positionsCount: row.positions_count ?? 0,
              statementsCount: row.statements_count ?? 0,
              publicFiguresCount: row.public_figures_count ?? 0,
              figures: Array.isArray(row.figures)
                ? (row.figures as Array<{ id: string; name: string; slug: string }>)
                : [],
            }),
          )
        },
        catch: (error) =>
          new DatabaseError(
            `Failed to fetch subject summaries: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
          ),
      }),
  }
}
