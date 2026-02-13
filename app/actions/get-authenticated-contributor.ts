import { createSSRSupabaseClient } from '../../infra/supabase/ssr'

export async function getAuthenticatedContributor() {
  const supabase = await createSSRSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: contributor } = await supabase
    .from('contributors')
    .select('id, reputation')
    .eq('id', user.id)
    .single()

  return contributor
}
