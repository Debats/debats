import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import { rolesByFigure, roleOf } from '../../domain/read-models/author-role'
import {
  JointDeclarationPage,
  JointDeclarationSummary,
  TakenStance,
} from '../../domain/read-models/joint-declaration'
import {
  organisationRef,
  publicFigureRef,
  StatementAuthorRef,
} from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'
import { databaseError } from '../database/database-error'
import {
  JointDeclarationRow,
  mapJointDeclarationRow,
} from '../database/joint-declaration-repository-supabase'
import { createOccupationRepository } from '../database/occupation-repository-supabase'

/** A signatory row: exactly one of the two author tables is joined */
interface SignatoryJoin {
  rank: number
  public_figures: { id: string; name: string; slug: string } | null
  organisations: { id: string; name: string; slug: string; acronym: string | null } | null
}

const SIGNATORIES_EMBED = `
  joint_declaration_signatories (
    rank,
    public_figures (id, name, slug),
    organisations (id, name, slug, acronym)
  )`

/** Who signed, in the order the signatures were recorded */
function signatoriesOf(rows: SignatoryJoin[]): StatementAuthorRef[] {
  return [...rows]
    .sort((a, b) => a.rank - b.rank)
    .flatMap((row) =>
      row.organisations
        ? [organisationRef(row.organisations)]
        : row.public_figures
          ? [publicFigureRef(row.public_figures)]
          : [],
    )
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
    const signatories = signatoriesOf(row.joint_declaration_signatories)
    const figureIds = signatories.filter((s) => s.kind === 'public_figure').map((s) => s.id)
    return Effect.map(
      createOccupationRepository(supabase).findCurrentHeldByPublicFigureIds(figureIds),
      (held): JointDeclarationPage => {
        const roles = rolesByFigure(held)
        return {
          declaration: mapJointDeclarationRow(row),
          stances: stancesOf(row.joint_declaration_positions),
          signatories: signatories.map((author) => ({ author, role: roleOf(author, roles) })),
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

/** Every joint declaration of the site, with the subjects it engages and who signed it */
export function loadJointDeclarationIndex(
  supabase: SupabaseClient<Database>,
): Effect.Effect<JointDeclarationSummary[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase
        .from('joint_declarations')
        .select(INDEX_QUERY)
        .order('declared_at', { ascending: false })

      if (error) throw error
      return (data as IndexRow[]).map(
        (row): JointDeclarationSummary => ({
          id: row.id,
          title: row.title,
          slug: row.slug,
          ...(row.presentation ? { presentation: row.presentation } : {}),
          declaredAt: new Date(row.declared_at),
          subjects: [...row.joint_declaration_positions]
            .sort((a, b) => a.rank - b.rank)
            .filter((taken) => !taken.subjects.deleted_at)
            .map((taken) => ({ title: taken.subjects.title, slug: taken.subjects.slug })),
          signatories: signatoriesOf(row.joint_declaration_signatories),
        }),
      )
    },
    catch: (error) => databaseError('Failed to fetch the joint declarations', error),
  })
}
