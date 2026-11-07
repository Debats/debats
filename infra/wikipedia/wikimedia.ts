const USER_AGENT = 'Debats.co/1.0 (https://debats.co)'

/**
 * How long we wait for an answer. A contributor is waiting on the other end:
 * both callers turn a failed call into something they can say to her, so
 * hanging would be the one outcome neither can report.
 */
const TIMEOUT_MS = 4000

/**
 * The language and the title a Wikipedia address names, or nothing.
 *
 * This is also the only gate between a contributor's text and an outgoing
 * request: nothing we are handed is ever fetched as given. The address is
 * taken apart here and the API URLs are built from the two pieces, so an
 * address pointing anywhere else — an intranet, a cloud metadata endpoint —
 * cannot become a call this server makes.
 */
export function extractLangAndTitle(url: string): { lang: string; title: string } | null {
  const match = url.match(/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/(.+)$/)
  if (!match) return null
  return { lang: match[1], title: decodeURIComponent(match[2]) }
}

/** A call to a Wikimedia API, named and time-boxed; its status is the caller's to read */
export function fetchWikimedia(url: string): Promise<Response> {
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

/**
 * Asks a Wikimedia API, or fails.
 *
 * For the caller that judges a page, an answer it could not get is not an
 * answer: the domain lets an unchecked URL be reported as unchecked, and it
 * can only do that if we refuse to answer on its behalf. The caller that
 * merely reads a summary wants the status instead, and uses `fetchWikimedia`.
 */
export async function askWikimedia(url: string): Promise<unknown> {
  const response = await fetchWikimedia(url)
  if (!response.ok) {
    throw new Error(`Wikimedia answered ${response.status} for ${url}`)
  }
  return response.json()
}
