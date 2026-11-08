'use server'

import { NOT_AN_ARTICLE } from '../../domain/use-cases/notoriety'
import {
  readWikipediaSummary,
  UnfilledReason,
  WikipediaFacts,
} from '../../infra/wikipedia/wikipedia-summary'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type { WikipediaFacts } from '../../infra/wikipedia/wikipedia-summary'

export type FillResult = ({ found: true } & WikipediaFacts) | { found: false; message: string }

/**
 * Pourquoi rien n'a été rempli, dit au contributeur.
 *
 * Les messages se font ici et non dans le formulaire, comme partout ailleurs
 * sur le site : une action rend des phrases (`error`, `fieldErrors`) et le
 * client les affiche. Le formulaire qui inventerait les siennes à partir d'un
 * code aurait deux endroits à tenir d'accord, et c'est ce qui a fait dire deux
 * fois la même chose de deux façons.
 *
 * Celui de la page hors article reprend la clause du domaine, qui porte la
 * même règle : ici on propose d'ouvrir le bon article, là on refuse l'adresse
 * comme preuve.
 */
const MESSAGES: Record<UnfilledReason, string> = {
  not_wikipedia: 'Ce n’est pas une adresse de page Wikipédia (https://fr.wikipedia.org/wiki/…).',
  not_a_page: 'Cette page Wikipédia n’existe pas.',
  not_an_article: `${NOT_AN_ARTICLE} Ouvrez l’article sur Wikipédia et recopiez son adresse.`,
  ambiguous:
    'Cette adresse mène à une page d’homonymie, qui ne décrit personne en particulier. Ouvrez la bonne page sur Wikipédia et recopiez son adresse.',
  unreachable: 'Wikipédia n’a pas répondu. Réessayez dans un instant.',
}

const NOT_SIGNED_IN = 'Votre session a expiré. Reconnectez-vous pour utiliser le remplissage.'

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
  if (!contributor) return { found: false, message: NOT_SIGNED_IN }

  const summary = await readWikipediaSummary(url)
  return summary.found ? summary : { found: false, message: MESSAGES[summary.reason] }
}
