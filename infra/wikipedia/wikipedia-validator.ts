import {
  WikipediaValidator,
  WikipediaValidationResult,
} from '../../domain/services/wikipedia-validator'
import { askWikimedia, extractLangAndTitle } from './wikimedia'

const WIKIDATA_HUMAN_ID = 'Q5'

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
