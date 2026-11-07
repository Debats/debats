import {
  WikipediaValidator,
  WikipediaValidationResult,
} from '../../domain/services/wikipedia-validator'

const WIKIDATA_HUMAN_ID = 'Q5'
const USER_AGENT = 'Debats.co/1.0 (https://debats.co)'

/**
 * How long we wait for an answer. A contributor is waiting on the other end,
 * and the domain now turns a failed lookup into « we could not check this page
 * for the moment » — so hanging would be the one outcome it cannot report.
 */
const TIMEOUT_MS = 4000

/** The URL's shape is judged by the domain before the validator is ever asked */
function extractLangAndTitle(url: string): { lang: string; title: string } | null {
  const match = url.match(/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/(.+)$/)
  if (!match) return null
  return { lang: match[1], title: decodeURIComponent(match[2]) }
}

/**
 * Asks a Wikimedia API, or fails.
 *
 * A page we could not reach is not a page that does not exist. The domain
 * lets an unjudged URL through on purpose — the site does not depend on
 * Wikipedia to accept a contribution — and it can only do that if we refuse
 * to answer on its behalf. Guessing here used to refuse a personality and, by
 * the mirror rule, accept an organisation whose page describes a person.
 */
async function askWikimedia(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Wikimedia answered ${response.status} for ${url}`)
  }
  return response.json()
}

interface WikipediaPage {
  missing?: string
  pageprops?: { wikibase_item?: string }
}

interface Claim {
  mainsnak?: { datavalue?: { value?: { id?: string } } }
}

export function createWikipediaValidator(): WikipediaValidator {
  return {
    async validatePage(url: string): Promise<WikipediaValidationResult> {
      const parsed = extractLangAndTitle(url)
      if (!parsed) return { exists: false, isBiography: false }

      const page = await askPage(parsed)

      // The API reports a title it does not hold as « missing », with a 200
      if ('missing' in page) return { exists: false, isBiography: false }

      const wikidataId = page.pageprops?.wikibase_item
      if (!wikidataId) {
        // The page is there, but nothing says what it describes
        throw new Error(`No Wikidata item for ${url}`)
      }

      return { exists: true, isBiography: await isHuman(wikidataId, url) }
    },
  }
}

/** The page and its Wikidata identifier, as Wikipedia reports them */
async function askPage(parsed: { lang: string; title: string }): Promise<WikipediaPage> {
  const data = (await askWikimedia(
    `https://${parsed.lang}.wikipedia.org/w/api.php` +
      `?action=query&format=json&prop=pageprops&titles=${encodeURIComponent(parsed.title)}` +
      `&ppprop=wikibase_item`,
  )) as { query?: { pages?: Record<string, WikipediaPage> } }

  const pages = data.query?.pages
  const page = pages && Object.values(pages)[0]
  if (!page) throw new Error(`Wikipedia answered without a page for ${parsed.title}`)
  return page
}

/**
 * What Wikidata says the item is: a human, or something else. An item that
 * claims nothing about what it is settles nothing, so it fails rather than
 * pass for « not a person ».
 */
async function isHuman(wikidataId: string, url: string): Promise<boolean> {
  const data = (await askWikimedia(
    `https://www.wikidata.org/w/api.php` +
      `?action=wbgetclaims&format=json&entity=${wikidataId}&property=P31`,
  )) as { claims?: { P31?: Claim[] } }

  const claims = data.claims?.P31
  if (!claims || claims.length === 0) {
    throw new Error(`Wikidata says nothing about what ${wikidataId} is, for ${url}`)
  }

  return claims.some((claim) => claim.mainsnak?.datavalue?.value?.id === WIKIDATA_HUMAN_ID)
}
