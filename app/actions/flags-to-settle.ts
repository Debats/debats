'use server'

import { Effect } from 'effect'
import { canPerform } from '../../domain/reputation/permissions'
import { countFlaggedEntities } from '../../infra/queries/flag-queue'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

/**
 * How many entities wait for a moderator, for the header of who may settle
 * them; null for everyone else, who is not shown the queue at all.
 */
export async function flagsToSettleAction(): Promise<number | null> {
  const contributor = await getAuthenticatedContributor()
  if (!contributor || !canPerform(contributor.reputation, 'settle_flag')) return null
  return Effect.runPromise(countFlaggedEntities(createAdminSupabaseClient()))
}
