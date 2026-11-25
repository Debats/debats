import { SupabaseClient } from '@supabase/supabase-js'
import { Effect, Option } from 'effect'
import { Database } from '../../types/database.types'
import { isCurrentMembership } from '../../domain/entities/organisation-membership'
import { organisationRef, publicFigureRef } from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'
import { SiteStatement } from '../../domain/services/site-analyses'
import { databaseError } from '../database/database-error'
import { fetchAllRows } from '../database/fetch-all-pages'

type Client = SupabaseClient<Database>

interface StatementRow {
  statement_type: SiteStatement['type']
  joint_declaration_id: string | null
  source_name: string
  position_id: string
  positions: { subjects: { id: string; title: string; slug: string } }
  public_figures: { id: string; name: string; slug: string; deleted_at: string | null } | null
  organisations: {
    id: string
    name: string
    slug: string
    acronym: string | null
    deleted_at: string | null
  } | null
}

const STATEMENT_COLUMNS = `
  statement_type, joint_declaration_id, source_name, position_id,
  positions!inner (deleted_at, subjects!inner (id, title, slug, deleted_at)),
  public_figures (id, name, slug, deleted_at),
  organisations (id, name, slug, acronym, deleted_at)`

/** The author of a row, when she is still there */
const authorOf = (row: StatementRow): SiteStatement['author'] | null => {
  if (row.public_figures && !row.public_figures.deleted_at)
    return publicFigureRef(row.public_figures)
  if (row.organisations && !row.organisations.deleted_at) return organisationRef(row.organisations)
  return null
}

/**
 * Every statement of the site whose position, subject and author are still
 * there, as the analyses of the site read them: who, on which subject, for
 * which position, how. The whole table is read, page after page: the day it
 * weighs too much, the analyses get a projection of their own.
 */
export function loadSiteStatements(
  supabase: Client,
): Effect.Effect<SiteStatement[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await fetchAllRows<StatementRow>((offset, limit) =>
        supabase
          .from('statements')
          .select(STATEMENT_COLUMNS, { count: 'exact' })
          .is('deleted_at', null)
          .is('positions.deleted_at', null)
          .is('positions.subjects.deleted_at', null)
          .order('id')
          .range(offset, offset + limit - 1)
          .overrideTypes<StatementRow[], { merge: false }>(),
      )
      return rows.flatMap((row) => {
        const author = authorOf(row)
        return author
          ? [
              {
                author,
                subject: {
                  id: row.positions.subjects.id,
                  title: row.positions.subjects.title,
                  slug: row.positions.subjects.slug,
                },
                positionId: row.position_id,
                type: row.statement_type,
                signed: row.joint_declaration_id !== null,
                sourceName: row.source_name,
              },
            ]
          : []
      })
    },
    catch: (error) => databaseError('Failed to read the statements of the site', error),
  })
}

/**
 * The current members of every organisation: organisation id → the ids of the
 * public figures affiliated on that day. Whether an affiliation still runs is
 * the domain's to say.
 */
export function loadCurrentMembers(
  supabase: Client,
  today: Date,
): Effect.Effect<Map<string, Set<string>>, DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await fetchAllRows((offset, limit) =>
        supabase
          .from('organisation_memberships')
          .select('organisation_id, public_figure_id, ended_on', { count: 'exact' })
          .order('id')
          .range(offset, offset + limit - 1),
      )
      const members = new Map<string, Set<string>>()
      for (const row of rows) {
        const endedOn = Option.map(Option.fromNullable(row.ended_on), (day) => new Date(day))
        if (!isCurrentMembership({ endedOn }, today)) continue
        members.set(
          row.organisation_id,
          (members.get(row.organisation_id) ?? new Set()).add(row.public_figure_id),
        )
      }
      return members
    },
    catch: (error) => databaseError('Failed to read the members of organisations', error),
  })
}
