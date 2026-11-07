'use server'

import {
  readWikipediaSummary,
  UnfilledReason,
  WikipediaFacts,
} from '../../infra/wikipedia/wikipedia-summary'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type { WikipediaFacts } from '../../infra/wikipedia/wikipedia-summary'

/**
 * Why nothing was filled. The first four reasons come from the page, the fifth
 * from us: the action is for signed-in contributors, and a visitor who calls
 * it has not met a page problem.
 */
export type FillFailure = UnfilledReason | 'not_allowed'

export type FillResult = ({ found: true } & WikipediaFacts) | { found: false; reason: FillFailure }

/**
 * What a Wikipedia page gives a form to copy: its title and its first lines.
 * Nothing is written, nothing is judged — the contributor asks, reads, and
 * corrects.
 *
 * For signed-in contributors only: this is the one action of the site that
 * sends a request out of this server, and only the contribution forms use it.
 * The reader separately refuses any address that is not a Wikipedia page, so
 * we never fetch what we are handed.
 */
export async function fillFromWikipedia(url: string): Promise<FillResult> {
  const contributor = await getAuthenticatedContributor()
  if (!contributor) return { found: false, reason: 'not_allowed' }

  return readWikipediaSummary(url)
}
