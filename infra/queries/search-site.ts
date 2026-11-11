import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { SEARCH_HIT_KINDS, SearchHit, SearchHitKind } from '../../domain/read-models/search'
import { DatabaseError } from '../../domain/repositories/errors'

const isKind = (value: string): value is SearchHitKind =>
  (SEARCH_HIT_KINDS as readonly string[]).includes(value)

/** A row of `search_site` as the hit it is; a row the read model cannot hold fails loudly */
function toHit(row: Record<string, unknown>): SearchHit {
  const kind = row.kind as string
  if (!isKind(kind)) throw new Error(`Unknown search hit kind: ${kind}`)
  const found = {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    detail: (row.detail as string | null) ?? null,
  }
  if (kind !== 'position') return { ...found, kind }
  if (typeof row.subject_slug !== 'string')
    throw new Error(`Position ${found.id} found without the slug of its subject`)
  return { ...found, kind, subjectSlug: row.subject_slug }
}

/**
 * Everything the site knows under a few words: subjects, positions, public
 * figures, organisations, arguments and themes, the best matches of each
 * kind first (the `search_site` function, accent- and typo-tolerant).
 */
export function searchSite(
  supabase: SupabaseClient,
  query: string,
  perKind: number,
): Effect.Effect<SearchHit[], DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase.rpc('search_site', {
        p_query: query,
        p_per_kind: perKind,
      })

      if (error) throw error

      return (data as Record<string, unknown>[]).map(toHit)
    },
    catch: (error) => {
      const msg = `Failed to search the site: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      Sentry.captureException(error, { extra: { query } })
      return new DatabaseError(msg)
    },
  })
}
