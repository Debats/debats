import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database.types'
import { StatedPosition } from '../../domain/read-models/position-changes'
import { DatabaseError } from '../../domain/repositories/errors'

type Client = SupabaseClient<Database>
type MovedRow = Database['public']['Functions']['get_moved_statements']['Returns'][number]

const toStatedPosition = (row: MovedRow): StatedPosition => ({
  figure: { id: row.figure_id, name: row.figure_name, slug: row.figure_slug },
  subject: { id: row.subject_id, title: row.subject_title, slug: row.subject_slug },
  position: { id: row.position_id, title: row.position_title },
  statedAt: new Date(row.stated_at),
  createdAt: new Date(row.created_at),
})

/**
 * The statements of the public figures who took more than one position on a
 * subject (the `get_moved_statements` function): what the changes of position
 * are read from. Whether there was a change is for the domain to say.
 */
export function loadMovedStatements(
  supabase: Client,
): Effect.Effect<StatedPosition[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_moved_statements')
      if (error) throw error
      return data.map(toStatedPosition)
    },
    catch: (error) => {
      Sentry.captureException(error)
      const detail = error instanceof Error ? error.message : JSON.stringify(error)
      return new DatabaseError(`Failed to read the statements of figures who moved: ${detail}`)
    },
  })
}
