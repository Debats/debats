import { StatementContent, quoteOf } from '../entities/statement'
import { coverageOf, quoteAppearsIn, textOfHtml } from './quote-match'

/** What came back from the source, or why nothing did. */
export type FetchedPage = { status: number; contentType: string; body: string } | { error: string }

/**
 * What the check concludes about one draft.
 *
 * `verified`, `close` and `missing` are judgements on the words: all there,
 * most there (a person must compare), none there. `reachable` is all a vote or
 * an act can get, having no words of their own. `unreachable` is a source that
 * did not answer. `unverifiable` is a source only a person can read — the
 * machine says nothing rather than something wrong.
 */
export type Verdict =
  | { kind: 'verified' }
  | { kind: 'close'; coverage: number }
  | { kind: 'reachable' }
  | { kind: 'missing' }
  | { kind: 'unreachable'; reason: string }
  | { kind: 'unverifiable'; reason: string }

/** Below this share of the words, the page does not carry the quote in any form */
const CLOSE_ENOUGH = 0.5

/** Fewer characters than this is no page: a script wall, a consent screen, an empty shell */
const MIN_PAGE_TEXT = 100

/** Sites that serve their words through scripts, or behind a login */
const BROWSER_ONLY = [
  'x.com',
  'twitter.com',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'linkedin.com',
]

/** The host a source lives on, without its www */
export const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const needsABrowser = (url: string): boolean => {
  const host = hostOf(url)
  return BROWSER_ONLY.some((site) => host === site || host.endsWith(`.${site}`))
}

/** A refusal aimed at the visitor, not a page that is gone: a paywall, a bot wall, a rate limit */
const turnsRobotsAway = (status: number): boolean => [401, 402, 403, 429].includes(status)

/** The media type alone, without its charset */
const mediaTypeOf = (contentType: string): string => contentType.split(';')[0].trim().toLowerCase()

/** Whether the words of a page can be read as text: HTML and plain text, not a PDF */
export const isReadable = (contentType: string): boolean => {
  const mediaType = mediaTypeOf(contentType)
  return mediaType.startsWith('text/') || mediaType === 'application/xhtml+xml'
}

/** Words to look for on the page: a statement's content, or a bare quote while it is being written */
export type Words = StatementContent | { quote: string | undefined }

export const verdictFor = (words: Words, sourceUrl: string, page: FetchedPage | null): Verdict => {
  if (needsABrowser(sourceUrl)) return { kind: 'unverifiable', reason: hostOf(sourceUrl) }
  if (page === null) return { kind: 'unreachable', reason: 'not fetched' }
  if ('error' in page) return { kind: 'unreachable', reason: page.error }
  if (turnsRobotsAway(page.status)) return { kind: 'unverifiable', reason: `HTTP ${page.status}` }
  if (page.status >= 400) return { kind: 'unreachable', reason: `HTTP ${page.status}` }
  if (!isReadable(page.contentType)) {
    return { kind: 'unverifiable', reason: mediaTypeOf(page.contentType) || 'unknown media type' }
  }

  const text = textOfHtml(page.body)
  if (text.length < MIN_PAGE_TEXT) return { kind: 'unverifiable', reason: 'page sans texte' }

  const quote = 'kind' in words ? quoteOf(words) : words.quote
  if (quote === undefined) return { kind: 'reachable' }
  if (quoteAppearsIn(quote, text)) return { kind: 'verified' }
  const coverage = coverageOf(quote, text)
  return coverage >= CLOSE_ENOUGH ? { kind: 'close', coverage } : { kind: 'missing' }
}
