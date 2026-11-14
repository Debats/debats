/**
 * The notebook of a chantier: the pages its agent read and found worth
 * keeping, each with a line on what it holds, dead ends included. The agent
 * keeps it on the site as it goes, so it outlives the session: a context
 * reduced starts a new session with an empty disk, and what was only read
 * there would have to be found again.
 */

export type ChantierSource = {
  url: string
  /** What the page holds, or why it led nowhere, in a line */
  note: string
}

export const SOURCES_PER_CALL_MAX = 50
export const SOURCE_URL_MAX_LENGTH = 2000
export const SOURCE_NOTE_MAX_LENGTH = 300

const EXPECTED = 'Expected { "sources": [ { "url": "https://…", "note": "…" } ] }'

/** An address of a web page, and nothing else: the notebook is read back by an agent and shown to a person */
function webAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (url.length === 0 || url.length > SOURCE_URL_MAX_LENGTH) return null
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

function noteOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const note = value.trim()
  return note.length > 0 && note.length <= SOURCE_NOTE_MAX_LENGTH ? note : null
}

/**
 * The sources an agent notes in one call: a few at a time, each a web
 * address and a short note. An address noted twice keeps its last note.
 */
export function parseNotedSources(
  body: unknown,
): { sources: ChantierSource[] } | { error: string } {
  if (typeof body !== 'object' || body === null || !('sources' in body)) return { error: EXPECTED }
  const raw = (body as { sources: unknown }).sources
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > SOURCES_PER_CALL_MAX) {
    return { error: `Field sources must be an array of 1 to ${SOURCES_PER_CALL_MAX} sources` }
  }

  const noted = new Map<string, string>()
  for (const entry of raw) {
    const url = webAddress((entry as { url?: unknown } | null)?.url)
    const note = noteOf((entry as { note?: unknown } | null)?.note)
    if (url === null) {
      return {
        error: `Each source needs a "url": an http(s) address of at most ${SOURCE_URL_MAX_LENGTH} characters`,
      }
    }
    if (note === null) {
      return { error: `Each source needs a "note" of 1 to ${SOURCE_NOTE_MAX_LENGTH} characters` }
    }
    noted.delete(url)
    noted.set(url, note)
  }
  return { sources: Array.from(noted, ([url, note]) => ({ url, note })) }
}
