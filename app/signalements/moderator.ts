import { notFound } from 'next/navigation'
import { canPerform } from '../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'

/**
 * The contributor who may settle flags, or a page that does not exist: the
 * queue is not shown to anyone else, and does not say it is there.
 */
export async function requireModerator() {
  const contributor = await getAuthenticatedContributor()
  if (!contributor || !canPerform(contributor.reputation, 'settle_flag')) notFound()
  return contributor
}
