import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import { Statement, StatementId, LatestStatement } from '../../domain/entities/statement'
import { Position, PositionId, PositionSlug, PositionTitle } from '../../domain/entities/position'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../../domain/entities/subject'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../../domain/entities/public-figure'
import {
  DatabaseError,
  StatementRepository,
  StatementWithDetails,
  StatementWithFigure,
} from '../../domain/repositories/statement-repository'

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

type StatementRow = Database['public']['Tables']['statements']['Row']
type PositionRow = Database['public']['Tables']['positions']['Row']
type SubjectRow = Database['public']['Tables']['subjects']['Row']
type PublicFigureRow = Database['public']['Tables']['public_figures']['Row']

function mapStatementRow(row: StatementRow): Statement {
  return Statement.make({
    id: StatementId.make(row.id),
    publicFigureId: row.public_figure_id,
    positionId: row.position_id,
    sourceName: row.source_name,
    sourceUrl: row.source_url ?? undefined,
    quote: row.quote,
    statedAt: new Date(row.stated_at),
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at!),
    updatedAt: new Date(row.updated_at!),
  })
}

function mapPositionRow(row: PositionRow): Position {
  return Position.make({
    id: PositionId.make(row.id),
    title: PositionTitle.make(row.title),
    slug: PositionSlug.make(row.slug),
    description: row.description,
    subjectId: row.subject_id,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at!),
    updatedAt: new Date(row.updated_at!),
  })
}

function mapSubjectRow(row: SubjectRow): Subject {
  return Subject.make({
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
}

function mapPublicFigureRow(row: PublicFigureRow): PublicFigure {
  return PublicFigure.make({
    id: PublicFigureId.make(row.id),
    name: PublicFigureName.make(row.name),
    slug: PublicFigureSlug.make(row.slug),
    presentation: row.presentation,
    wikipediaUrl: Option.fromNullable(row.wikipedia_url),
    notorietySources: row.notoriety_sources ?? [],
    websiteUrl: Option.fromNullable(row.website_url),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at!),
    updatedAt: new Date(row.updated_at!),
  })
}

const STATEMENT_WITH_DETAILS_QUERY = `
  id, public_figure_id, position_id, source_name, source_url, quote, stated_at,
  created_by, created_at, updated_at, deleted_at,
  positions!inner (
    id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at,
    subjects!inner (
      id, title, slug, presentation, problem, picture_url, created_by, created_at, updated_at, deleted_at
    )
  )
`

interface StatementWithDetailsRow extends StatementRow {
  positions: PositionRow & { subjects: SubjectRow }
}

function mapStatementWithDetailsRow(row: StatementWithDetailsRow): StatementWithDetails {
  return {
    statement: mapStatementRow(row),
    position: mapPositionRow(row.positions),
    subject: mapSubjectRow(row.positions.subjects),
  }
}

export function createStatementRepository(supabase: SupabaseClient<Database>): StatementRepository {
  return {
    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }

          return mapStatementRow(data)
        },
        catch: (error) => dbError('Failed to fetch statement', error),
      }),

    findByPublicFigureId: (publicFigureId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('*')
            .eq('public_figure_id', publicFigureId)
            .is('deleted_at', null)

          if (error) throw error
          return data.map(mapStatementRow)
        },
        catch: (error) => dbError('Failed to fetch statements', error),
      }),

    findByPositionId: (positionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('*')
            .eq('position_id', positionId)
            .is('deleted_at', null)

          if (error) throw error
          return data.map(mapStatementRow)
        },
        catch: (error) => dbError('Failed to fetch statements', error),
      }),

    findByPositionIdWithFigures: (positionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(
              `
            id, public_figure_id, position_id, source_name, source_url, quote, stated_at,
            created_by, created_at, updated_at, deleted_at,
            positions!inner (
              id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at
            ),
            public_figures!inner (
              id, name, slug, presentation, wikipedia_url, notoriety_sources, website_url,
              created_by, created_at, updated_at, deleted_at
            )
          `,
            )
            .eq('position_id', positionId)
            .is('deleted_at', null)
            .order('stated_at', { ascending: false })

          if (error) throw error

          return data.map((row) => ({
            statement: mapStatementRow(row),
            position: mapPositionRow(row.positions),
            publicFigure: mapPublicFigureRow(row.public_figures),
          }))
        },
        catch: (error) => dbError('Failed to fetch statements with figures for position', error),
      }),

    findByPublicFigureWithDetails: (publicFigureId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_DETAILS_QUERY)
            .eq('public_figure_id', publicFigureId)
            .is('deleted_at', null)

          if (error) throw error
          return data.map(mapStatementWithDetailsRow)
        },
        catch: (error) => dbError('Failed to fetch statements with details', error),
      }),

    findByPublicFigureAndSubject: (publicFigureId: string, subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_DETAILS_QUERY)
            .eq('public_figure_id', publicFigureId)
            .eq('positions.subject_id', subjectId)
            .is('deleted_at', null)

          if (error) throw error
          return data.map(mapStatementWithDetailsRow)
        },
        catch: (error) => dbError('Failed to fetch statements for figure and subject', error),
      }),

    findBySubjectWithFigures: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(
              `
            id, public_figure_id, position_id, source_name, source_url, quote, stated_at,
            created_by, created_at, updated_at, deleted_at,
            positions!inner (
              id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at
            ),
            public_figures!inner (
              id, name, slug, presentation, wikipedia_url, notoriety_sources, website_url,
              created_by, created_at, updated_at, deleted_at
            )
          `,
            )
            .eq('positions.subject_id', subjectId)
            .is('deleted_at', null)

          if (error) throw error

          return data.map((row) => ({
            statement: mapStatementRow(row),
            position: mapPositionRow(row.positions),
            publicFigure: mapPublicFigureRow(row.public_figures),
          }))
        },
        catch: (error) => dbError('Failed to fetch statements with figures', error),
      }),

    findLatest: (limit: number) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(
              `
            id,
            stated_at,
            positions!inner (
              title,
              subjects!inner (
                title,
                slug
              )
            ),
            public_figures!inner (
              name,
              slug
            )
          `,
            )
            .is('deleted_at', null)
            .order('stated_at', { ascending: false })
            .limit(limit)

          if (error) throw error

          return data.map((row) => ({
            statementId: row.id,
            publicFigureName: row.public_figures.name,
            publicFigureSlug: row.public_figures.slug,
            positionTitle: row.positions.title,
            subjectTitle: row.positions.subjects.title,
            subjectSlug: row.positions.subjects.slug,
            statedAt: new Date(row.stated_at),
          }))
        },
        catch: (error) => dbError('Failed to fetch latest statements', error),
      }),

    findLatestReported: (limit: number) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(
              `
            id,
            created_at,
            positions!inner (
              title,
              subjects!inner (
                title,
                slug
              )
            ),
            public_figures!inner (
              name,
              slug
            )
          `,
            )
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(limit)

          if (error) throw error

          return data.map((row) => ({
            statementId: row.id,
            publicFigureName: row.public_figures.name,
            publicFigureSlug: row.public_figures.slug,
            positionTitle: row.positions.title,
            subjectTitle: row.positions.subjects.title,
            subjectSlug: row.positions.subjects.slug,
            statedAt: row.created_at ? new Date(row.created_at!) : new Date(),
          }))
        },
        catch: (error) => dbError('Failed to fetch latest reported statements', error),
      }),

    create: (statement: Statement) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .insert({
              id: statement.id,
              public_figure_id: statement.publicFigureId,
              position_id: statement.positionId,
              source_name: statement.sourceName,
              source_url: statement.sourceUrl,
              quote: statement.quote,
              stated_at: toISODate(statement.statedAt),
              created_by: statement.createdBy,
            })
            .select()
            .single()

          if (error) throw error
          return mapStatementRow(data)
        },
        catch: (error) => dbError('Failed to create statement', error),
      }),

    update: (statement: Statement) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .update({
              position_id: statement.positionId,
              source_name: statement.sourceName,
              source_url: statement.sourceUrl ?? null,
              quote: statement.quote,
              stated_at: toISODate(statement.statedAt),
            })
            .eq('id', statement.id)
            .select()
            .single()

          if (error) throw error
          return mapStatementRow(data)
        },
        catch: (error) => dbError('Failed to update statement', error),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('statements')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete statement', error),
      }),
  }
}
