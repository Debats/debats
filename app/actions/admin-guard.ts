import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'

export async function getAdminContributor() {
  const contributor = await getAuthenticatedContributor()
  if (!contributor) return null
  if (!canPerform(contributor.reputation, 'admin')) return null
  return contributor
}
