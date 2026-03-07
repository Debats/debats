import { createSSRSupabaseClient } from '../../infra/supabase/ssr'

export async function getAuthenticatedContributor() {
  const supabase = await createSSRSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('contributors')
    .select('id, reputation')
    .eq('id', user.id)
    .single()

  if (!data) return null

  return {
    id: data.id,
    reputation: data.reputation ?? 0,
    name: (user.user_metadata?.name as string) ?? null,
    email: user.email ?? null,
  }
}
