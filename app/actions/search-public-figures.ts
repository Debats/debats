'use server'

import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'

export interface PublicFigureSearchResult {
  id: string
  name: string
  slug: string
}

export async function searchPublicFigures(query: string): Promise<PublicFigureSearchResult[]> {
  if (query.length < 2) return []

  const supabase = await createSSRSupabaseClient()
  const repo = createPublicFigureRepository(supabase)

  const figures = await Effect.runPromise(repo.searchByName(query, 10))

  return figures.map((f) => ({ id: f.id, name: f.name, slug: f.slug }))
}
