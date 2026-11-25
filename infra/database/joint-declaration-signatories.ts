import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import { DocumentedSubjects, mostDocumentedFirst } from '../../domain/read-models/joint-declaration'
import {
  organisationRef,
  publicFigureRef,
  StatementAuthorRef,
} from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'
import { databaseError } from './database-error'
import { fetchInChunks } from './in-chunks'

/**
 * Who signed a joint declaration, as every read of the site names them: from
 * the most documented on the site to the least. What the page of a text, the
 * index of the texts and the feed all read their signatories with.
 */

/** A signatory row: exactly one of the two author tables is joined */
export interface SignatoryJoin {
  public_figures: { id: string; name: string; slug: string } | null
  organisations: { id: string; name: string; slug: string; acronym: string | null } | null
}

/** The signatories of a joint declaration, embedded in a read of it */
export const SIGNATORIES_EMBED = `
  joint_declaration_signatories (
    public_figures (id, name, slug),
    organisations (id, name, slug, acronym)
  )`

/** Who signed, in no order: `mostDocumentedFirst` gives them theirs */
export function signatoriesOf(rows: SignatoryJoin[]): StatementAuthorRef[] {
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
export function loadDocumentedSubjects(
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
