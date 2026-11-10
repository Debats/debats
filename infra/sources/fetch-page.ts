import { FetchedPage, isReadable } from '../../domain/services/source-verdict'

const FETCH_TIMEOUT_MS = 15_000
const USER_AGENT = 'Mozilla/5.0 (compatible; debats.co draft verifier; +https://debats.co)'

/**
 * Fetches a source page as the draft verifier and the assisted revision read
 * it: the body only when its words can be read as text, a failure named the
 * way a person would name it, never thrown.
 */
export async function fetchPage(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<FetchedPage> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    })
    const contentType = response.headers.get('content-type') ?? ''
    const body = isReadable(contentType) ? await response.text() : ''
    return { status: response.status, contentType, body }
  } catch (error) {
    return { error: causeOf(error) }
  }
}

/** What stopped the fetch, as a person would name it */
const causeOf = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error)
  if (error.name === 'TimeoutError') return 'délai dépassé'
  // undici wraps the network error: the cause names it (ENOTFOUND, ECONNREFUSED…)
  const { cause } = error as { cause?: unknown }
  return cause instanceof Error ? cause.message : error.message
}
