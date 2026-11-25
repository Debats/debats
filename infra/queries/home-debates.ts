import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database.types'
import {
  Debate,
  DebatePosition,
  SiteFigures,
  voicesBySubject,
} from '../../domain/read-models/home-debates'
import { DatabaseError } from '../../domain/repositories/errors'
import { authorKey } from '../../domain/services/author-on-subject'
import { dayKey } from '../../domain/value-objects/day'
import { fetchAllRows } from '../database/fetch-all-pages'

type Client = SupabaseClient<Database>
type DebateRow = Database['public']['Functions']['get_home_debates']['Returns'][number]

const failedTo =
  (what: string, extra?: Record<string, unknown>) =>
  (error: unknown): DatabaseError => {
    Sentry.captureException(error, { extra })
    const detail = error instanceof Error ? error.message : JSON.stringify(error)
    return new DatabaseError(`Failed to ${what}: ${detail}`)
  }

const toDebate = (row: DebateRow): Debate => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  problem: row.problem,
  createdAt: new Date(row.created_at),
  voices: Number(row.voices),
  statementsCount: Number(row.statements_count),
  recentStatementsCount: Number(row.recent_statements_count),
  theme:
    row.theme_name !== null && row.theme_slug !== null
      ? { name: row.theme_name.trim(), slug: row.theme_slug }
      : null,
  positions: (row.positions as unknown as DebatePosition[]).map((position) => ({
    id: position.id,
    title: position.title,
    slug: position.slug,
    voices: Number(position.voices),
  })),
})

/**
 * Every live subject with its voices and how they spread over its positions
 * (the `get_home_debates` function): what the home page compares subjects by,
 * read once. `recentSince` is the instant the page counts recent statements
 * from: the function has no clock of its own.
 */
export function loadHomeDebates(
  supabase: Client,
  recentSince: Date,
): Effect.Effect<Debate[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_home_debates', {
        p_recent_since: recentSince.toISOString(),
      })
      if (error) throw error
      return data.map(toDebate)
    },
    catch: failedTo('read the debates of the home page', { recentSince }),
  })
}

interface VoiceRow {
  positions: { subject_id: string }
  public_figures: { id: string; deleted_at: string | null } | null
  organisations: { id: string; deleted_at: string | null } | null
}

/** Who a statement gives a voice to, when she is still on the site */
const liveAuthorOf = (row: VoiceRow): { kind: string; id: string } | null => {
  if (row.public_figures && row.public_figures.deleted_at === null)
    return { kind: 'public_figure', id: row.public_figures.id }
  if (row.organisations && row.organisations.deleted_at === null)
    return { kind: 'organisation', id: row.organisations.id }
  return null
}

/**
 * How many voices spoke on each subject since a day: subject id → the
 * distinct live authors of the live statements stated that day or after. A
 * voice is counted as `get_home_debates` counts it; only the days differ.
 */
export function loadVoicesSince(
  supabase: Client,
  since: Date,
): Effect.Effect<Map<string, number>, DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const rows = await fetchAllRows<VoiceRow>((offset, limit) =>
        supabase
          .from('statements')
          .select(
            `positions!inner (subject_id, deleted_at, subjects!inner (deleted_at)),
             public_figures (id, deleted_at),
             organisations (id, deleted_at)`,
            { count: 'exact' },
          )
          .is('deleted_at', null)
          .is('positions.deleted_at', null)
          .is('positions.subjects.deleted_at', null)
          .gte('stated_at', dayKey(since))
          .order('id')
          .range(offset, offset + limit - 1)
          .overrideTypes<VoiceRow[], { merge: false }>(),
      )
      return voicesBySubject(
        rows.flatMap((row) => {
          const author = liveAuthorOf(row)
          return author
            ? [{ subjectId: row.positions.subject_id, authorKey: authorKey(author) }]
            : []
        }),
      )
    },
    catch: failedTo('count the voices of late', { since }),
  })
}

/** What the site holds, counted (the `get_site_figures` function) */
export function loadSiteFigures(supabase: Client): Effect.Effect<SiteFigures, DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_site_figures')
      if (error) throw error
      const [row] = data
      if (!row) throw new Error('get_site_figures returned no row')
      return {
        subjects: Number(row.subjects),
        positions: Number(row.positions),
        statements: Number(row.statements),
        publicFigures: Number(row.public_figures),
        organisations: Number(row.organisations),
        sources: Number(row.sources),
      }
    },
    catch: failedTo('count the content of the site'),
  })
}
