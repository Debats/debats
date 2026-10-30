'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { searchSite } from '../../infra/queries/search-site'
import { parseSearchQuery, SearchHit } from '../../domain/read-models/search'

/** Hits of each kind the header field shows at most */
const HEADER_HITS_PER_KIND = 3

/** What the header field asks as one types: a few hits of each kind */
export async function searchEverywhere(raw: string): Promise<SearchHit[]> {
  const query = parseSearchQuery(raw)
  if (!query) return []
  return Effect.runPromise(searchSite(createAdminSupabaseClient(), query, HEADER_HITS_PER_KIND))
}
