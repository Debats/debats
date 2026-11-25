import * as Sentry from '@sentry/nextjs'
import { Effect, Option, pipe } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import {
  Statement,
  StatementId,
  WORDED_STATEMENT_TYPES,
  organisationAuthor,
  publicFigureAuthor,
} from '../../domain/entities/statement'
import { LatestStatement } from '../../domain/read-models/latest-statement'
import { ArgumentRef } from '../../domain/read-models/argument'
import { feedEntriesOf, NAMED_IN_ENTRY } from '../../domain/read-models/feed-entries'
import { loadSignatories } from './joint-declaration-signatories'
import { fetchInChunks } from './in-chunks'
import { Position, PositionId, PositionSlug, PositionTitle } from '../../domain/entities/position'
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
import { mapRowToEntity as mapSubjectRow, SubjectRow } from './subject-repository-supabase'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

type StatementRow = Database['public']['Tables']['statements']['Row']
type PositionRow = Database['public']['Tables']['positions']['Row']

/** The database guarantees exactly one of the two author columns is set */
function mapAuthor(row: Pick<StatementRow, 'public_figure_id' | 'organisation_id'>) {
  if (row.organisation_id) return organisationAuthor(row.organisation_id)
  if (row.public_figure_id) return publicFigureAuthor(row.public_figure_id)
  throw new Error('Statement without author')
}

/** The joint declaration a signature comes from, when the query joined it */
interface JointDeclarationJoin {
  id: string
  title: string
  slug: string
}

function mapStatementRow(
  row: StatementRow & { joint_declarations?: JointDeclarationJoin | null },
): Statement {
  return Statement.make({
    id: StatementId.make(row.id),
    author: mapAuthor(row),
    positionId: row.position_id,
    content: toStatementContent(row),
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    statedAt: new Date(row.stated_at),
    ...(row.joint_declarations ? { jointDeclaration: row.joint_declarations } : {}),
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
  joint_declaration_id, joint_declarations (id, title, slug),
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

/**
 * A statement as a list of the whole site shows it: with its author, its
 * position, its subject and its arguments (none required). Which statements a
 * list holds, and in which order, is for a function of the database to say
 * (`get_feed_entries`, `get_statements_to_review`).
 */
const FEED_QUERY = `
  ${STATEMENT_COLUMNS},
  positions!inner (
    id, title, slug, description, subject_id, created_by, created_at, updated_at, deleted_at,
    subjects!inner (
      id, title, slug, presentation, problem, picture_url, created_by, created_at, updated_at, deleted_at
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
  source_name: string
  positions: { title: string; slug: string; subjects: { title: string; slug: string } }
  public_figures: FigureJoin | null
  organisations: OrganisationJoin | null
}

function mapLatestStatementRow(row: LatestStatementRow): LatestStatement {
  return {
    statementId: row.id,
    author: toAuthorRef(row.public_figures, row.organisations),
    positionTitle: row.positions.title,
    positionSlug: row.positions.slug,
    subjectTitle: row.positions.subjects.title,
    subjectSlug: row.positions.subjects.slug,
    statedAt: new Date(row.stated_at),
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

/**
 * These statements as a list of the whole site shows them — author, position,
 * subject, arguments —, in the order their ids are given: a function of the
 * database picked and ranked them, a second read comes back in no order.
 */
async function readFeedStatements(
  supabase: SupabaseClient<Database>,
  ids: readonly string[],
): Promise<StatementWithAuthorAndSubject[]> {
  const rows = await fetchInChunks([...ids], async (chunk) => {
    const { data, error } = await supabase.from('statements').select(FEED_QUERY).in('id', chunk)
    if (error) throw error
    return data as unknown as StatementWithAuthorAndSubjectRow[]
  })
  const rank = new Map(ids.map((id, index) => [id, index]))
  return rows
    .map(mapStatementWithAuthorAndSubjectRow)
    .sort((a, b) => (rank.get(a.statement.id) ?? 0) - (rank.get(b.statement.id) ?? 0))
}

export function createStatementRepository(supabase: SupabaseClient<Database>): StatementRepository {
  return {
    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_COLUMNS)
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
            .select(STATEMENT_COLUMNS)
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
            .select(STATEMENT_COLUMNS)
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

    findToReview: (viewerId: string | null, page: { limit: number; offset: number }) =>
      Effect.tryPromise({
        try: async () => {
          // The function picks which statements and counts them; the feed query then reads them as any other
          const picked = await supabase.rpc('get_statements_to_review', {
            p_viewer: viewerId,
            p_limit: page.limit,
            p_offset: page.offset,
          })
          if (picked.error) throw picked.error
          const queued = picked.data as { id: string; total: number }[]
          if (queued.length === 0) return { entries: [], total: 0 }

          return {
            entries: await readFeedStatements(
              supabase,
              queued.map(({ id }) => id),
            ),
            total: Number(queued[0].total),
          }
        },
        catch: (error) => dbError('Failed to fetch the statements to review', error),
      }),

    findLatestQuotedByPositionId: (positionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_AUTHOR_QUERY)
            .eq('position_id', positionId)
            .is('deleted_at', null)
            // A vote keeps a sentence in its `quote` column: the type tells words from facts
            .in('statement_type', [...WORDED_STATEMENT_TYPES])
            .order('stated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)

          if (error) throw error
          const [row] = data as unknown as StatementWithAuthorRow[]
          return row ? mapStatementWithAuthorRow(row) : null
        },
        catch: (error) =>
          dbError('Failed to fetch the latest quoted statement of a position', error),
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

    findByAuthorAndSubjectIds: (author, subjectIds) =>
      Effect.tryPromise({
        try: async () => {
          if (subjectIds.length === 0) return []
          const column = author.kind === 'organisation' ? 'organisation_id' : 'public_figure_id'
          const { data, error } = await supabase
            .from('statements')
            .select(STATEMENT_WITH_DETAILS_QUERY)
            .eq(column, author.id)
            .in('positions.subject_id', subjectIds)
            .is('deleted_at', null)

          if (error) throw error
          return data.map(mapStatementWithDetailsRow)
        },
        catch: (error) => dbError('Failed to fetch statements for author and subjects', error),
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

    findFeed: (filters, ranking, gathering, page) =>
      pipe(
        Effect.tryPromise({
          try: async () => {
            // The function narrows, gathers, ranks and pages the entries; their statements are then read
            const { data, error } = await supabase.rpc('get_feed_entries', {
              p_order: ranking,
              p_limit: page.limit,
              p_offset: page.offset,
              p_author_kind: filters.authorKind,
              p_theme_slug: filters.themeSlug,
              p_statement_type: filters.statementType,
              p_declaration_slug: filters.jointDeclarationSlug,
              p_gather_days: gathering === 'signatures-and-days',
              p_shown: NAMED_IN_ENTRY,
            })
            if (error) throw error
            const listed = data.map((row) => ({
              declarationId: row.declaration_id,
              statementIds: row.statement_ids,
              size: Number(row.size),
            }))
            return {
              listed,
              statements: await readFeedStatements(
                supabase,
                listed.flatMap(({ statementIds }) => statementIds),
              ),
              // Past the last page nothing is listed, and nothing says how much the feed holds
              total: Number(data[0]?.total ?? 0),
              gathered: Number(data[0]?.statements ?? 0),
            }
          },
          catch: (error) => dbError('Failed to fetch the statements feed', error),
        }),
        Effect.flatMap(({ listed, statements, total, gathered }) =>
          Effect.map(
            loadSignatories(
              supabase,
              listed.flatMap(({ declarationId }) => declarationId ?? []),
            ),
            (signatories) => ({
              entries: feedEntriesOf(listed, statements, signatories, filters.authorKind),
              total,
              statements: gathered,
            }),
          ),
        ),
      ),

    findSignatureId: (jointDeclarationId, author, positionId) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('id')
            .eq('joint_declaration_id', jointDeclarationId)
            .eq('position_id', positionId)
            .eq(author.kind === 'organisation' ? 'organisation_id' : 'public_figure_id', author.id)
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle()

          if (error) throw error
          return data?.id ?? null
        },
        catch: (error) => dbError('Failed to fetch the statement of a signature', error),
      }),

    findSignatureIds: (jointDeclarationId, author) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('id')
            .eq('joint_declaration_id', jointDeclarationId)
            .eq(author.kind === 'organisation' ? 'organisation_id' : 'public_figure_id', author.id)
            .is('deleted_at', null)

          if (error) throw error
          return data.map((row) => row.id)
        },
        catch: (error) => dbError('Failed to fetch the statements of a signature', error),
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

    findLatest: (limit: number, subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          // On one subject, a signature is the statement the signatory holds there
          const { data, error } = await supabase
            .from('statements')
            .select(LATEST_STATEMENT_QUERY)
            .is('deleted_at', null)
            .eq('positions.subject_id', subjectId)
            .order('stated_at', { ascending: false })
            .limit(limit)

          if (error) throw error
          return (data as unknown as LatestStatementRow[]).map(mapLatestStatementRow)
        },
        catch: (error) => dbError('Failed to fetch latest statements', error),
      }),
  }
}
