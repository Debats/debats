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
import { ArgumentRef } from '../../domain/read-models/argument'
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
  StatementWithAuthorAndSubject,
} from '../../domain/repositories/statement-repository'
import { toStatementContent } from './statement-content-columns'

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
    content: toStatementContent(row),
    sourceName: row.source_name,
    sourceUrl: row.source_url,
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
/** The arguments a statement mobilises, as PostgREST embeds them through the link table */
const ARGUMENTS_EMBED = `argument_statements (argument_id, arguments (id, title, slug, deleted_at))`

interface ArgumentLinkJoin {
  argument_id: string
  arguments: { id: string; title: string; slug: string; deleted_at: string | null } | null
}

/** Live arguments only, by title: a soft-deleted argument keeps its links */
function toArgumentRefs(links: ArgumentLinkJoin[] | null): ArgumentRef[] {
  return (links ?? [])
    .flatMap((link) =>
      link.arguments && !link.arguments.deleted_at
        ? [{ id: link.arguments.id, title: link.arguments.title, slug: link.arguments.slug }]
        : [],
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'fr'))
}

/**
 * The columns of a statement itself, which every query of this module selects:
 * its own, plus the one column per content variant that its type fills.
 */
const STATEMENT_COLUMNS = `
  id, public_figure_id, organisation_id, position_id, source_name, source_url, stated_at,
  statement_type, quote, document_name, voted_text, vote_choice, deed,
  created_by, created_at, updated_at, deleted_at`

const STATEMENT_WITH_AUTHOR_QUERY = `
  ${STATEMENT_COLUMNS},
  positions!inner (
    id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at
  ),
  public_figures (id, name, slug),
  organisations (id, name, slug, acronym),
  ${ARGUMENTS_EMBED}
`

interface StatementWithAuthorRow extends StatementRow {
  positions: PositionRow
  public_figures: FigureJoin | null
  organisations: OrganisationJoin | null
  argument_statements: ArgumentLinkJoin[] | null
}

function mapStatementWithAuthorRow(row: StatementWithAuthorRow): StatementWithAuthor {
  return {
    statement: mapStatementRow(row),
    position: mapPositionRow(row.positions),
    author: toAuthorRef(row.public_figures, row.organisations),
    arguments: toArgumentRefs(row.argument_statements),
  }
}

/** The author query with the subject embedded under the position: an argument's page reads it */
const STATEMENT_WITH_AUTHOR_AND_SUBJECT_QUERY = `
  ${STATEMENT_COLUMNS},
  positions!inner (
    id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at,
    subjects!inner (
      id, title, slug, presentation, problem, picture_url, created_by, created_at, updated_at, deleted_at
    )
  ),
  public_figures (id, name, slug),
  organisations (id, name, slug, acronym),
  argument_statements!inner (argument_id, arguments (id, title, slug, deleted_at))
`

interface StatementWithAuthorAndSubjectRow extends StatementWithAuthorRow {
  positions: PositionRow & { subjects: SubjectRow }
}

/** What narrowing a feed query needs from the builder, whatever it selects */
interface FeedQueryBuilder {
  is(column: string, value: null): this
  not(column: string, operator: string, value: null): this
  eq(column: string, value: string): this
}

/**
 * The feed query: every live statement with its author, position, subject
 * and arguments (none required). Filtering by theme joins the subject's
 * themes, which only then narrows to subjects that have one.
 */
const feedQuery = (themeSlug: string | undefined) => `
  ${STATEMENT_COLUMNS},
  positions!inner (
    id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at,
    subjects!inner (
      id, title, slug, presentation, problem, picture_url, created_by, created_at, updated_at, deleted_at
      ${themeSlug ? ', subject_themes!inner (themes!inner (slug))' : ''}
    )
  ),
  public_figures (id, name, slug),
  organisations (id, name, slug, acronym),
  ${ARGUMENTS_EMBED}
`

function mapStatementWithAuthorAndSubjectRow(
  row: StatementWithAuthorAndSubjectRow,
): StatementWithAuthorAndSubject {
  return {
    ...mapStatementWithAuthorRow(row),
    subject: mapSubjectRow(row.positions.subjects),
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
  ${STATEMENT_COLUMNS},
  positions!inner (
    id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at,
    subjects!inner (
      id, title, slug, presentation, problem, picture_url, created_by, created_at, updated_at, deleted_at
    )
  ),
  ${ARGUMENTS_EMBED}
`

interface StatementWithDetailsRow extends StatementRow {
  positions: PositionRow & { subjects: SubjectRow }
  argument_statements: ArgumentLinkJoin[] | null
}

function mapStatementWithDetailsRow(row: StatementWithDetailsRow): StatementWithDetails {
  return {
    statement: mapStatementRow(row),
    position: mapPositionRow(row.positions),
    subject: mapSubjectRow(row.positions.subjects),
    arguments: toArgumentRefs(row.argument_statements),
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

    findByOrganisationAndSubject: (organisationId: string, subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_DETAILS_QUERY)
            .eq('organisation_id', organisationId)
            .eq('positions.subject_id', subjectId)
            .is('deleted_at', null)

          if (error) throw error
          return data.map(mapStatementWithDetailsRow)
        },
        catch: (error) => dbError('Failed to fetch statements for organisation and subject', error),
      }),

    findByArgumentWithAuthors: (argumentId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_AUTHOR_AND_SUBJECT_QUERY)
            .eq('argument_statements.argument_id', argumentId)
            .is('deleted_at', null)
            .order('stated_at', { ascending: false })

          if (error) throw error
          return (data as unknown as StatementWithAuthorAndSubjectRow[]).map(
            mapStatementWithAuthorAndSubjectRow,
          )
        },
        catch: (error) => dbError('Failed to fetch statements mobilising an argument', error),
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

    findBySubjectIdsWithAuthors: (subjectIds: string[]) =>
      subjectIds.length === 0
        ? Effect.succeed([])
        : Effect.tryPromise({
            try: async () => {
              const { data, error } = await supabase
                .from('statements')
                .select(STATEMENT_WITH_AUTHOR_QUERY)
                .in('positions.subject_id', subjectIds)
                .is('deleted_at', null)

              if (error) throw error
              return (data as unknown as StatementWithAuthorRow[]).map(mapStatementWithAuthorRow)
            },
            catch: (error) => dbError('Failed to fetch the statements of several subjects', error),
          }),

    findIdsBySubjectId: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('id, positions!inner (subject_id)')
            .eq('positions.subject_id', subjectId)
            .is('deleted_at', null)

          if (error) throw error
          return data.map((row) => row.id)
        },
        catch: (error) => dbError('Failed to fetch the statement ids of a subject', error),
      }),

    findFeed: (filters, page) =>
      Effect.tryPromise({
        try: async () => {
          // The same narrowing for the count and for the page
          const narrowed = <Q extends FeedQueryBuilder>(query: Q): Q => {
            let q = query
              .is('deleted_at', null)
              .is('positions.deleted_at', null)
              .is('positions.subjects.deleted_at', null)
            if (filters.authorKind === 'public_figure') q = q.not('public_figure_id', 'is', null)
            if (filters.authorKind === 'organisation') q = q.not('organisation_id', 'is', null)
            if (filters.statementType) q = q.eq('statement_type', filters.statementType)
            if (filters.themeSlug) {
              q = q.eq('positions.subjects.subject_themes.themes.slug', filters.themeSlug)
            }
            return q
          }
          const counted = await narrowed(
            supabase
              .from('statements')
              .select(feedQuery(filters.themeSlug), { count: 'exact', head: true }),
          )
          if (counted.error) throw counted.error
          const total = counted.count ?? 0
          // PostgREST refuses a range past the end: a page beyond the last one is simply empty
          if (page.offset >= total) return { entries: [], total }
          const { data, error } = await narrowed(
            supabase.from('statements').select(feedQuery(filters.themeSlug)),
          )
            .order('stated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .range(page.offset, page.offset + page.limit - 1)
          if (error) throw error
          return {
            entries: (data as unknown as StatementWithAuthorAndSubjectRow[]).map(
              mapStatementWithAuthorAndSubjectRow,
            ),
            total,
          }
        },
        catch: (error) => dbError('Failed to fetch the statements feed', error),
      }),

    findStatedSpanBySubjectId: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const edge = (ascending: boolean) =>
            supabase
              .from('statements')
              .select('stated_at, positions!inner (subject_id)')
              .eq('positions.subject_id', subjectId)
              .is('deleted_at', null)
              .order('stated_at', { ascending })
              .limit(1)
              .maybeSingle()
          const [first, last] = await Promise.all([edge(true), edge(false)])
          if (first.error) throw first.error
          if (last.error) throw last.error
          return first.data && last.data
            ? { from: new Date(first.data.stated_at), to: new Date(last.data.stated_at) }
            : null
        },
        catch: (error) => dbError('Failed to fetch the stated span of a subject', error),
      }),

    findIdsByArgumentId: (argumentId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('argument_statements')
            .select('statement_id, statements!inner (deleted_at)')
            .eq('argument_id', argumentId)
            .is('statements.deleted_at', null)

          if (error) throw error
          return data.map((row) => row.statement_id)
        },
        catch: (error) => dbError('Failed to fetch the statement ids of an argument', error),
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
  }
}
