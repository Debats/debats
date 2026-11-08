import { extractLangAndTitle, fetchWikimedia } from './wikimedia'

/**
 * Why a page gave nothing to fill a form with. Each reason is a different
 * thing to tell the contributor, which is why they are not one boolean:
 * a wrong address, a title that does not exist, a title that names several
 * subjects, and Wikipedia not answering are four different problems.
 */
export type UnfilledReason =
  | 'not_wikipedia'
  | 'not_a_page'
  | 'not_an_article'
  | 'ambiguous'
  | 'unreachable'

/** The main namespace, where articles live; categories and portals have their own */
const ARTICLE_NAMESPACE = 0

/** Ce qu'une page donne à recopier. Nommé une fois, et porté jusqu'au formulaire */
export interface WikipediaFacts {
  name: string
  presentation: string
}

export type WikipediaSummary =
  | ({ found: true } & WikipediaFacts)
  | { found: false; reason: UnfilledReason }

const unfilled = (reason: UnfilledReason): WikipediaSummary => ({ found: false, reason })

interface SummaryBody {
  type?: string
  title?: string
  extract?: string
  namespace?: { id?: number }
}

/**
 * What a Wikipedia page says about itself, to fill a form with: its title and
 * the first lines of the article.
 *
 * Nothing here is judged — the notoriety criterion is the domain's business,
 * and this is a convenience the contributor asks for and then reads. The one
 * thing it refuses is an address that is not a Wikipedia page, because that
 * refusal is what keeps a contributor's text from becoming a request this
 * server makes.
 *
 * A disambiguation page is turned down although it exists: « Martin est un nom
 * propre et un nom commun » is not a presentation of anybody, and silently
 * copying it would have the contributor send something absurd.
 */
export async function readWikipediaSummary(url: string): Promise<WikipediaSummary> {
  const parsed = extractLangAndTitle(url)
  if (!parsed) return unfilled('not_wikipedia')

  try {
    const response = await fetchWikimedia(
      `https://${parsed.lang}.wikipedia.org/api/rest_v1/page/summary/` +
        encodeURIComponent(parsed.title),
    )

    if (response.status === 404) return unfilled('not_a_page')
    if (!response.ok) return unfilled('unreachable')

    const body = (await response.json()) as SummaryBody

    if (body.type === 'disambiguation') return unfilled('ambiguous')

    /*
     * A category, a portal or a talk page: it exists, and copying its title
     * would put « Catégorie:Association française » in the name field. The
     * namespace is read when the payload carries it — it does, on every
     * answer measured — and a payload without it is still worth its title.
     */
    if (body.namespace?.id !== undefined && body.namespace.id !== ARTICLE_NAMESPACE) {
      return unfilled('not_an_article')
    }

    const name = body.title?.trim()
    if (!name) return unfilled('not_a_page')

    return { found: true, name, presentation: body.extract?.trim() ?? '' }
  } catch {
    /*
     * A timeout, a dropped connection, a body that is not JSON: the form is
     * waiting on an answer, so every one of those is « Wikipedia did not
     * answer ». Nothing is swallowed — the contributor is told, and the only
     * thing lost is the distinction between ways of not answering.
     */
    return unfilled('unreachable')
  }
}
