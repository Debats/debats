import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import {
  Statement,
  StatementId,
  organisationAuthor,
  publicFigureAuthor,
} from '../../domain/entities/statement'
import { LatestStatement } from '../../domain/read-models/latest-statement'
import { Position, PositionId, PositionSlug, PositionTitle } from '../../domain/entities/position'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../../domain/entities/subject'
import {
  organisationRef,
  publicFigureRef,
  StatementAuthorRef,
} from '../../domain/read-models/statement-author'
import {
  DatabaseError,
  StatementRepository,
  StatementWithDetails,
  StatementWithAuthor,
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

/** The database guarantees exactly one of the two author columns is set */
function mapAuthor(row: Pick<StatementRow, 'public_figure_id' | 'organisation_id'>) {
  if (row.organisation_id) return organisationAuthor(row.organisation_id)
  if (row.public_figure_id) return publicFigureAuthor(row.public_figure_id)
  throw new Error('Statement without author')
}

function mapStatementRow(row: StatementRow): Statement {
  return Statement.make({
    id: StatementId.make(row.id),
    author: mapAuthor(row),
    positionId: row.position_id,
    statementType: row.statement_type,
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

interface FigureJoin {
  id: string
  name: string
  slug: string
}

interface OrganisationJoin {
  id: string
  name: string
  slug: string
  acronym: string | null
}

/** Both author tables are left-joined; exactly one side is present */
function toAuthorRef(
  figure: FigureJoin | null,
  organisation: OrganisationJoin | null,
): StatementAuthorRef {
  if (organisation) return organisationRef(organisation)
  if (figure) return publicFigureRef(figure)
  throw new Error('Statement without author')
}

/** Columns of a statement with its position and either author, as PostgREST embeds them */
const STATEMENT_WITH_AUTHOR_QUERY = `
  id, public_figure_id, organisation_id, position_id, statement_type, source_name, source_url, quote, stated_at,
  created_by, created_at, updated_at, deleted_at,
  positions!inner (
    id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at
  ),
  public_figures (id, name, slug),
  organisations (id, name, slug, acronym)
`

interface StatementWithAuthorRow extends StatementRow {
  positions: PositionRow
  public_figures: FigureJoin | null
  organisations: OrganisationJoin | null
}

function mapStatementWithAuthorRow(row: StatementWithAuthorRow): StatementWithAuthor {
  return {
    statement: mapStatementRow(row),
    position: mapPositionRow(row.positions),
    author: toAuthorRef(row.public_figures, row.organisations),
  }
}

/** Columns of the "latest statements" projection */
const LATEST_STATEMENT_QUERY = `
  id,
  stated_at,
  created_at,
  source_name,
  positions!inner (
    title,
    slug,
    subjects!inner (
      title,
      slug
    )
  ),
  public_figures (id, name, slug),
  organisations (id, name, slug, acronym)
`

interface LatestStatementRow {
  id: string
  stated_at: string
  created_at: string | null
  source_name: string
  positions: { title: string; slug: string; subjects: { title: string; slug: string } }
  public_figures: FigureJoin | null
  organisations: OrganisationJoin | null
}

function mapLatestStatementRow(row: LatestStatementRow, datedBy: 'stated_at' | 'created_at') {
  const date = datedBy === 'stated_at' ? row.stated_at : row.created_at
  return {
    statementId: row.id,
    author: toAuthorRef(row.public_figures, row.organisations),
    positionTitle: row.positions.title,
    positionSlug: row.positions.slug,
    subjectTitle: row.positions.subjects.title,
    subjectSlug: row.positions.subjects.slug,
    statedAt: date ? new Date(date) : new Date(),
    sourceName: row.source_name,
  }
}

const STATEMENT_WITH_DETAILS_QUERY = `
  id, public_figure_id, organisation_id, position_id, statement_type, source_name, source_url, quote, stated_at,
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

    findByPositionIdWithAuthors: (positionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_AUTHOR_QUERY)
            .eq('position_id', positionId)
            .is('deleted_at', null)
            .order('stated_at', { ascending: false })

          if (error) throw error
          return (data as unknown as StatementWithAuthorRow[]).map(mapStatementWithAuthorRow)
        },
        catch: (error) => dbError('Failed to fetch statements with authors for position', error),
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

    findByOrganisationWithDetails: (organisationId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_DETAILS_QUERY)
            .eq('organisation_id', organisationId)
            .is('deleted_at', null)

          if (error) throw error
          return data.map(mapStatementWithDetailsRow)
        },
        catch: (error) => dbError('Failed to fetch organisation statements', error),
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

    findBySubjectWithAuthors: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_AUTHOR_QUERY)
            .eq('positions.subject_id', subjectId)
            .is('deleted_at', null)

          if (error) throw error
          return (data as unknown as StatementWithAuthorRow[]).map(mapStatementWithAuthorRow)
        },
        catch: (error) => dbError('Failed to fetch statements with authors', error),
      }),

    findLatest: (limit: number, subjectId?: string) =>
      Effect.tryPromise({
        try: async () => {
          const query = supabase
            .from('statements')
            .select(LATEST_STATEMENT_QUERY)
            .is('deleted_at', null)
            .order('stated_at', { ascending: false })
            .limit(limit)

          const { data, error } = await (subjectId
            ? query.eq('positions.subject_id', subjectId)
            : query)

          if (error) throw error
          return (data as unknown as LatestStatementRow[]).map((row) =>
            mapLatestStatementRow(row, 'stated_at'),
          )
        },
        catch: (error) => dbError('Failed to fetch latest statements', error),
      }),

    findLatestReported: (limit: number) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(LATEST_STATEMENT_QUERY)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(limit)

          if (error) throw error
          return (data as unknown as LatestStatementRow[]).map((row) =>
            mapLatestStatementRow(row, 'created_at'),
          )
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
              public_figure_id:
                statement.author.kind === 'public_figure' ? statement.author.id : null,
              organisation_id:
                statement.author.kind === 'organisation' ? statement.author.id : null,
              position_id: statement.positionId,
              statement_type: statement.statementType,
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
              statement_type: statement.statementType,
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
