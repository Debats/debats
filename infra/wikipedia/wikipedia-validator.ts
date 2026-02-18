import {
  WikipediaValidator,
  WikipediaValidationResult,
} from '../../domain/services/wikipedia-validator'

const WIKIDATA_HUMAN_ID = 'Q5'

function extractLangAndTitle(url: string): { lang: string; title: string } | null {
  const match = url.match(/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/(.+)$/)
  if (!match) return null
  return { lang: match[1], title: decodeURIComponent(match[2]) }
}

export function createWikipediaValidator(): WikipediaValidator {
  return {
    async validatePage(url: string): Promise<WikipediaValidationResult> {
      const parsed = extractLangAndTitle(url)
      if (!parsed) return { exists: false, isBiography: false }

      // Step 1: Check page exists and get its Wikidata ID
      const apiUrl =
        `https://${parsed.lang}.wikipedia.org/w/api.php` +
        `?action=query&format=json&prop=pageprops&titles=${encodeURIComponent(parsed.title)}` +
        `&ppprop=wikibase_item`

      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Debats.co/1.0 (https://debats.co)' },
      })

      if (!response.ok) return { exists: false, isBiography: false }

      const data = await response.json()
      const pages = data.query?.pages
      if (!pages) return { exists: false, isBiography: false }

      const page = Object.values(pages)[0] as {
        missing?: string
        pageprops?: { wikibase_item?: string }
      }

      if ('missing' in page) {
        return { exists: false, isBiography: false }
      }

      const wikidataId = page.pageprops?.wikibase_item
      if (!wikidataId) {
        return { exists: true, isBiography: false }
      }

      // Step 2: Check Wikidata for "instance of human" (P31 = Q5)
      const wikidataUrl =
        `https://www.wikidata.org/w/api.php` +
        `?action=wbgetclaims&format=json&entity=${wikidataId}&property=P31`

      const wdResponse = await fetch(wikidataUrl, {
        headers: { 'User-Agent': 'Debats.co/1.0 (https://debats.co)' },
      })

      if (!wdResponse.ok) return { exists: true, isBiography: false }

      const wdData = await wdResponse.json()
      const claims = wdData.claims?.P31 ?? []
      const isBiography = claims.some(
        (claim: { mainsnak?: { datavalue?: { value?: { id?: string } } } }) =>
          claim.mainsnak?.datavalue?.value?.id === WIKIDATA_HUMAN_ID,
      )

      return { exists: true, isBiography }
    },
  }
}
