'use server'

import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'

export interface OrganisationSearchResult {
  id: string
  name: string
  slug: string
  acronym: string | null
}

export async function searchOrganisations(query: string): Promise<OrganisationSearchResult[]> {
  if (query.length < 2) return []

  const supabase = createAdminSupabaseClient()
  const repo = createOrganisationRepository(supabase)

  const organisations = await Effect.runPromise(repo.searchByName(query, 10))

  return organisations.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    acronym: Option.getOrNull(o.acronym),
  }))
}
