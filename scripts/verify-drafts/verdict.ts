import { StatementContent, quoteOf } from '../../domain/entities/statement'
import { quoteAppearsIn, textOfHtml } from './quote-match'

/** What came back from the source, or why nothing did. */
export type FetchedPage = { status: number; contentType: string; body: string } | { error: string }

/**
 * What the check concludes about one draft.
 *
 * `verified` and `missing` are judgements on the words; `reachable` is all a
 * vote or an act can get, having no words of their own; `unreachable` is a
 * source that did not answer; `unverifiable` is a source only a person can
 * read — the machine says nothing rather than something wrong.
 */
export type Verdict =
  | { kind: 'verified' }
  | { kind: 'reachable' }
  | { kind: 'missing' }
  | { kind: 'unreachable'; reason: string }
  | { kind: 'unverifiable'; reason: string }

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

/** The media type alone, without its charset */
const mediaTypeOf = (contentType: string): string => contentType.split(';')[0].trim().toLowerCase()

/** Whether the words of a page can be read as text: HTML and plain text, not a PDF */
export const isReadable = (contentType: string): boolean => {
  const mediaType = mediaTypeOf(contentType)
  return mediaType.startsWith('text/') || mediaType === 'application/xhtml+xml'
}

export const verdictFor = (
  content: StatementContent,
  sourceUrl: string,
  page: FetchedPage | null,
): Verdict => {
  if (needsABrowser(sourceUrl)) return { kind: 'unverifiable', reason: hostOf(sourceUrl) }
  if (page === null) return { kind: 'unreachable', reason: 'not fetched' }
  if ('error' in page) return { kind: 'unreachable', reason: page.error }
  if (page.status >= 400) return { kind: 'unreachable', reason: `HTTP ${page.status}` }
  if (!isReadable(page.contentType)) {
    return { kind: 'unverifiable', reason: mediaTypeOf(page.contentType) || 'unknown media type' }
  }

  const quote = quoteOf(content)
  if (quote === undefined) return { kind: 'reachable' }
  return quoteAppearsIn(quote, textOfHtml(page.body)) ? { kind: 'verified' } : { kind: 'missing' }
}
