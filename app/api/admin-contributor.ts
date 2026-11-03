import { Effect } from 'effect'
import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { ContributorIdentity } from '../../domain/entities/contributor'
import { createContributorRepository } from '../../infra/database/contributor-repository-supabase'
import { checkAdminApiKey } from './admin-auth'

/**
 * Who the admin API acts as when it writes to the journal: the contributor
 * named by ADMIN_CONTRIBUTOR_ID, with the reputation the journal granted her.
 * The API holds no session, so the actor is configuration, and a missing or
 * unknown one is a configuration fault, told as such rather than as a refusal.
 */
export async function adminContributor(
  supabase: SupabaseClient,
): Promise<{ contributor: ContributorIdentity } | { error: string }> {
  const id = process.env.ADMIN_CONTRIBUTOR_ID
  if (!id) return { error: 'ADMIN_CONTRIBUTOR_ID is not set' }

  const found = await Effect.runPromise(
    Effect.either(createContributorRepository(supabase).findById(id)),
  )
  if (found._tag === 'Left') return { error: 'Failed to load the admin contributor' }
  if (found.right === null) return { error: 'ADMIN_CONTRIBUTOR_ID names no contributor' }
  return { contributor: found.right }
}

/**
 * The preamble of every writing route of the admin API: the key, then the
 * actor. A bad key is a 401; a missing actor is our configuration, a 500.
 */
export async function adminActorOf(
  request: NextRequest,
  supabase: SupabaseClient,
): Promise<{ contributor: ContributorIdentity } | { response: NextResponse }> {
  if (!checkAdminApiKey(request)) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const actor = await adminContributor(supabase)
  if ('error' in actor) {
    return { response: NextResponse.json({ error: actor.error }, { status: 500 }) }
  }
  return { contributor: actor.contributor }
}
