import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database.types'
import { FigureAgreement, MIN_SUBJECTS_TO_PAIR } from '../../domain/read-models/figure-agreements'
import { DatabaseError } from '../../domain/repositories/errors'

type Client = SupabaseClient<Database>
type AgreementRow = Database['public']['Functions']['get_figure_agreements']['Returns'][number]

const toAgreement = (row: AgreementRow): FigureAgreement => ({
  a: { id: row.a_id, name: row.a_name, slug: row.a_slug },
  b: { id: row.b_id, name: row.b_name, slug: row.b_slug },
  agreedSubjects: Number(row.agreed_subjects),
  commonSubjects: Number(row.common_subjects),
  examples: (row.examples as unknown as FigureAgreement['examples']).map(({ title, slug }) => ({
    title,
    slug,
  })),
})

/**
 * The pairs of public figures that agree on the most subjects (the
 * `get_figure_agreements` function), among figures present enough to be
 * paired. `candidates` is how many pairs to read: more than the page shows,
 * since it shows each figure once.
 */
export function loadFigureAgreements(
  supabase: Client,
  candidates: number,
): Effect.Effect<FigureAgreement[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('get_figure_agreements', {
        p_min_subjects: MIN_SUBJECTS_TO_PAIR,
        p_limit: candidates,
      })
      if (error) throw error
      return data.map(toAgreement)
    },
    catch: (error) => {
      Sentry.captureException(error, { extra: { candidates } })
      const detail = error instanceof Error ? error.message : JSON.stringify(error)
      return new DatabaseError(`Failed to read the agreements between public figures: ${detail}`)
    },
  })
}
