import {
  WikipediaValidator,
  WikipediaValidationResult,
} from '../../domain/services/wikipedia-validator'

const BIOGRAPHY_CATEGORY = 'Catégorie:Wikipédia:Article biographique'

function extractLangAndTitle(url: string): { lang: string; title: string } | null {
  const match = url.match(/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/(.+)$/)
  if (!match) return null
  return { lang: match[1], title: match[2] }
}

export function createWikipediaValidator(): WikipediaValidator {
  return {
    async validatePage(url: string): Promise<WikipediaValidationResult> {
      const parsed = extractLangAndTitle(url)
      if (!parsed) return { exists: false, isBiography: false }

      const apiUrl =
        `https://${parsed.lang}.wikipedia.org/w/api.php` +
        `?action=query&format=json&prop=categories&titles=${encodeURIComponent(parsed.title)}&cllimit=50`

      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Debats.co/1.0 (https://debats.co)' },
      })

      if (!response.ok) return { exists: false, isBiography: false }

      const data = await response.json()
      const pages = data.query?.pages
      if (!pages) return { exists: false, isBiography: false }

      const page = Object.values(pages)[0] as { missing?: string; categories?: { title: string }[] }

      if ('missing' in page) {
        return { exists: false, isBiography: false }
      }

      const categories = page.categories ?? []
      const isBiography = categories.some((c) => c.title === BIOGRAPHY_CATEGORY)

      return { exists: true, isBiography }
    },
  }
}
