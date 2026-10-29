import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createContributorRepository } from '../../infra/database/contributor-repository-supabase'

/**
 * Who is signed in, as the commands know her (id and reputation, through the
 * contributor repository), with the name and e-mail authentication holds.
 * Null without a session or before the profile row exists.
 */
export async function getAuthenticatedContributor() {
  const supabase = await createSSRSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const contributor = await Effect.runPromise(
    createContributorRepository(supabase).findById(user.id),
  )

  if (!contributor) return null

  return {
    ...contributor,
    name: (user.user_metadata?.name as string) ?? null,
    email: user.email ?? null,
  }
}
