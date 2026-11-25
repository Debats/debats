import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database.types'
import { voicesBySubject } from '../../domain/read-models/spoken-lately'
import { DatabaseError } from '../../domain/repositories/errors'
import { authorKey } from '../../domain/services/author-on-subject'
import { dayKey } from '../../domain/value-objects/day'
import { databaseError } from '../database/database-error'
import { fetchAllRows } from '../database/fetch-all-pages'

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
 * voice is counted as the home page counts it (`get_home_debates`); only the
 * days differ. What the home page and the index of the subjects rank the
 * subjects being spoken on with.
 */
export function loadVoicesSince(
  supabase: SupabaseClient<Database>,
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
    catch: (error) => databaseError('Failed to count the voices of late', error),
  })
}
