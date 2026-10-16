'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'
import { ArgumentSuggestion } from '../../domain/read-models/argument'

/** Arguments whose title contains the query, most used first: the form's autocomplete */
export async function searchArguments(query: string): Promise<ArgumentSuggestion[]> {
  if (query.trim().length < 2) return []

  const supabase = createAdminSupabaseClient()
  return Effect.runPromise(createArgumentRepository(supabase).search(query, 8))
}
