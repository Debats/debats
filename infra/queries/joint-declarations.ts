import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import { rolesByFigure, roleOf } from '../../domain/read-models/author-role'
import {
  DocumentedSubjects,
  JointDeclarationPage,
  JointDeclarationSummary,
  mostDocumentedFirst,
  TakenStance,
} from '../../domain/read-models/joint-declaration'
import {
  organisationRef,
  publicFigureRef,
  StatementAuthorRef,
} from '../../domain/read-models/statement-author'
import { contentLine, StatementAuthor } from '../../domain/entities/statement'
import {
  AttachmentPlan,
  attachmentPlanOf,
  AuthoredStatement,
} from '../../domain/read-models/attachment-plan'
import { DatabaseError } from '../../domain/repositories/errors'
import { StatementContentColumns, toStatementContent } from '../database/statement-content-columns'
import { databaseError } from '../database/database-error'
import { fetchInChunks } from '../database/in-chunks'
import {
  JointDeclarationRow,
  mapJointDeclarationRow,
} from '../database/joint-declaration-repository-supabase'
import { createOccupationRepository } from '../database/occupation-repository-supabase'

/** A signatory row: exactly one of the two author tables is joined */
interface SignatoryJoin {
  public_figures: { id: string; name: string; slug: string } | null
  organisations: { id: string; name: string; slug: string; acronym: string | null } | null
}

const SIGNATORIES_EMBED = `
  joint_declaration_signatories (
    public_figures (id, name, slug),
    organisations (id, name, slug, acronym)
  )`

/** Who signed, in no order: `mostDocumentedFirst` gives them theirs */
function signatoriesOf(rows: SignatoryJoin[]): StatementAuthorRef[] {
  return rows.flatMap((row) =>
    row.organisations
      ? [organisationRef(row.organisations)]
      : row.public_figures
        ? [publicFigureRef(row.public_figures)]
        : [],
  )
}

const SUMMARY_VIEW = {
  public_figure: 'v_public_figure_activity_summary',
  organisation: 'v_organisation_summary',
} as const

/** On how many subjects the site documents each author of one kind, read from its summary view */
async function subjectsCounts(
  supabase: SupabaseClient<Database>,
  kind: StatementAuthorRef['kind'],
  authors: readonly StatementAuthorRef[],
): Promise<[string, number][]> {
  // A signatory of several texts is asked for once
  const ids = Array.from(
    new Set(authors.filter((author) => author.kind === kind).map(({ id }) => id)),
  )
  const rows = await fetchInChunks(ids, async (chunk) => {
    const { data, error } = await supabase
      .from(SUMMARY_VIEW[kind])
      .select('id, subjects_count')
      .in('id', chunk)
    if (error) throw error
    return data
  })
  return rows.flatMap((row) => (row.id ? [[row.id, row.subjects_count ?? 0]] : []))
}

/** On how many subjects the site documents each of these authors */
function loadDocumentedSubjects(
  supabase: SupabaseClient<Database>,
  authors: readonly StatementAuthorRef[],
): Effect.Effect<DocumentedSubjects, DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const [figures, organisations] = await Promise.all([
        subjectsCounts(supabase, 'public_figure', authors),
        subjectsCounts(supabase, 'organisation', authors),
      ])
      return new Map([...figures, ...organisations])
    },
    catch: (error) => databaseError('Failed to count the subjects of signatories', error),
  })
}

const PAGE_QUERY = `
  *,
  joint_declaration_positions (
    quote, rank,
    positions (id, title, slug, deleted_at),
    subjects (id, title, slug, problem, deleted_at)
  ),
  ${SIGNATORIES_EMBED}`

interface StanceJoin {
  quote: string
  rank: number
  positions: { id: string; title: string; slug: string; deleted_at: string | null }
  subjects: { id: string; title: string; slug: string; problem: string; deleted_at: string | null }
}

interface PageRow extends JointDeclarationRow {
  joint_declaration_positions: StanceJoin[]
  joint_declaration_signatories: SignatoryJoin[]
}

/**
 * What the text says, subject by subject, in the order it was recorded. A
 * position or a subject that has left the site since is left out: the page
 * shows what a reader can still follow.
 */
function stancesOf(rows: StanceJoin[]): TakenStance[] {
  return [...rows]
    .sort((a, b) => a.rank - b.rank)
    .filter((row) => !row.positions.deleted_at && !row.subjects.deleted_at)
    .map((row) => ({
      subject: {
        id: row.subjects.id,
        title: row.subjects.title,
        slug: row.subjects.slug,
        problem: row.subjects.problem,
      },
      position: { id: row.positions.id, title: row.positions.title, slug: row.positions.slug },
      quote: row.quote,
    }))
}

/**
 * Everything the page of a joint declaration shows, or null when no text
 * bears the slug: the text, what it takes position on, and who signed it
 * with the occupations they hold today.
 */
export function loadJointDeclarationPage(
  supabase: SupabaseClient<Database>,
  slug: string,
): Effect.Effect<JointDeclarationPage | null, DatabaseError> {
  const text = Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase
        .from('joint_declarations')
        .select(PAGE_QUERY)
        .eq('slug', slug)
        .maybeSingle()

      if (error) throw error
      return data as PageRow | null
    },
    catch: (error) => databaseError('Failed to fetch the joint declaration page', error),
  })

  return Effect.flatMap(text, (row) => {
    if (!row) return Effect.succeed(null)
    const signed = signatoriesOf(row.joint_declaration_signatories)
    const figureIds = signed.filter((s) => s.kind === 'public_figure').map((s) => s.id)
    return Effect.map(
      Effect.all(
        [
          loadDocumentedSubjects(supabase, signed),
          createOccupationRepository(supabase).findCurrentHeldByPublicFigureIds(figureIds),
        ],
        { concurrency: 'unbounded' },
      ),
      ([documented, held]): JointDeclarationPage => {
        const roles = rolesByFigure(held)
        return {
          declaration: mapJointDeclarationRow(row),
          stances: stancesOf(row.joint_declaration_positions),
          signatories: mostDocumentedFirst(signed, documented).map((author) => ({
            author,
            role: roleOf(author, roles),
          })),
        }
      },
    )
  })
}

const INDEX_QUERY = `
  id, title, slug, presentation, declared_at,
  joint_declaration_positions (rank, subjects (title, slug, deleted_at)),
  ${SIGNATORIES_EMBED}`

interface IndexRow {
  id: string
  title: string
  slug: string
  presentation: string | null
  declared_at: string
  joint_declaration_positions: {
    rank: number
    subjects: { title: string; slug: string; deleted_at: string | null }
  }[]
  joint_declaration_signatories: SignatoryJoin[]
}

/** The joint declarations, newest first — all of them, or the first few — and how many there are in all */
const fetchTexts = (
  supabase: SupabaseClient<Database>,
  limit?: number,
): Effect.Effect<{ rows: IndexRow[]; total: number }, DatabaseError> =>
  Effect.tryPromise({
    try: async () => {
      const newestFirst = supabase
        .from('joint_declarations')
        .select(INDEX_QUERY, { count: 'exact' })
        .order('declared_at', { ascending: false })
      const { data, error, count } = await (limit === undefined
        ? newestFirst
        : newestFirst.limit(limit))

      if (error) throw error
      const rows = data as IndexRow[]
      return { rows, total: count ?? rows.length }
    },
    catch: (error) => databaseError('Failed to fetch the joint declarations', error),
  })

/** The texts as an index or a shelf shows them, their signatories from the most documented to the least */
const summarised = (
  supabase: SupabaseClient<Database>,
  rows: IndexRow[],
): Effect.Effect<JointDeclarationSummary[], DatabaseError> =>
  Effect.map(
    loadDocumentedSubjects(
      supabase,
      rows.flatMap((row) => signatoriesOf(row.joint_declaration_signatories)),
    ),
    (documented) =>
      rows.map(
        (row): JointDeclarationSummary => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          ...(row.presentation ? { presentation: row.presentation } : {}),
          declaredAt: new Date(row.declared_at),
          subjects: [...row.joint_declaration_positions]
            .sort((a, b) => a.rank - b.rank)
            .filter((taken) => !taken.subjects.deleted_at)
            .map((taken) => ({ title: taken.subjects.title, slug: taken.subjects.slug }))
            // A text may take several positions on a subject: the subject is named once
            .filter(
              (subject, index, subjects) =>
                subjects.findIndex((other) => other.slug === subject.slug) === index,
            ),
          signatories: mostDocumentedFirst(
            signatoriesOf(row.joint_declaration_signatories),
            documented,
          ),
        }),
      ),
  )

/** Every joint declaration of the site, with the subjects it engages and who signed it */
export const loadJointDeclarationIndex = (
  supabase: SupabaseClient<Database>,
): Effect.Effect<JointDeclarationSummary[], DatabaseError> =>
  Effect.flatMap(fetchTexts(supabase), ({ rows }) => summarised(supabase, rows))

/** The latest joint declarations, and how many the site holds: what a page that only opens the index reads */
export const loadLatestJointDeclarations = (
  supabase: SupabaseClient<Database>,
  limit: number,
): Effect.Effect<{ shown: JointDeclarationSummary[]; total: number }, DatabaseError> =>
  Effect.flatMap(fetchTexts(supabase, limit), ({ rows, total }) =>
    Effect.map(summarised(supabase, rows), (shown) => ({ shown, total })),
  )

/**
 * Who signed each of these joint declarations, from the most documented on
 * the site to the least: declaration id → its signatories
 */
export const loadSignatories = (
  supabase: SupabaseClient<Database>,
  declarationIds: readonly string[],
): Effect.Effect<Map<string, StatementAuthorRef[]>, DatabaseError> => {
  if (declarationIds.length === 0) return Effect.succeed(new Map())
  const signed = Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase
        .from('joint_declarations')
        .select(`id, ${SIGNATORIES_EMBED}`)
        .in('id', [...declarationIds])
      if (error) throw error
      return (data as { id: string; joint_declaration_signatories: SignatoryJoin[] }[]).map(
        (row) => ({ id: row.id, signatories: signatoriesOf(row.joint_declaration_signatories) }),
      )
    },
    catch: (error) => databaseError('Failed to fetch the signatories of joint declarations', error),
  })
  return Effect.flatMap(signed, (texts) =>
    Effect.map(
      loadDocumentedSubjects(
        supabase,
        texts.flatMap(({ signatories }) => signatories),
      ),
      (documented) =>
        new Map(
          texts.map(({ id, signatories }) => [id, mostDocumentedFirst(signatories, documented)]),
        ),
    ),
  )
}

const AUTHORED_COLUMNS = `
  id, position_id, source_name, source_url, stated_at, joint_declaration_id,
  statement_type, quote, document_name, voted_text, vote_choice, deed`

type AuthoredRow = StatementContentColumns & {
  id: string
  position_id: string
  source_name: string
  source_url: string
  stated_at: string
  joint_declaration_id: string | null
}

/** What an author already says on the positions a text takes, signatures of the text included */
function loadAuthoredOn(
  supabase: SupabaseClient<Database>,
  author: StatementAuthor,
  positionIds: string[],
): Effect.Effect<AuthoredStatement[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      if (positionIds.length === 0) return []
      const { data, error } = await supabase
        .from('statements')
        .select(AUTHORED_COLUMNS)
        .eq(author.kind === 'organisation' ? 'organisation_id' : 'public_figure_id', author.id)
        .in('position_id', positionIds)
        .is('deleted_at', null)
        .order('stated_at', { ascending: false })

      if (error) throw error
      return (data as AuthoredRow[]).map((row) => ({
        id: row.id,
        positionId: row.position_id,
        summary: contentLine(toStatementContent(row)),
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        statedAt: new Date(row.stated_at),
        jointDeclarationId: row.joint_declaration_id,
      }))
    },
    catch: (error) => databaseError('Failed to fetch what an author says on a text', error),
  })
}

/**
 * What attaching a statement to the text that bears this slug will do, or
 * null when no text bears it: the positions the text takes, and what the
 * author of the statement already holds on each.
 */
export function loadAttachmentPlan(
  supabase: SupabaseClient<Database>,
  statement: {
    id: string
    author: StatementAuthor
    positionId: string
    subjectId: string
    sourceUrl: string
  },
  slug: string,
): Effect.Effect<AttachmentPlan | null, DatabaseError> {
  return Effect.flatMap(loadJointDeclarationPage(supabase, slug), (text) =>
    text === null
      ? Effect.succeed(null)
      : Effect.map(
          loadAuthoredOn(
            supabase,
            statement.author,
            text.stances.map((stance) => stance.position.id),
          ),
          (authored) => attachmentPlanOf(text, statement, authored),
        ),
  )
}
