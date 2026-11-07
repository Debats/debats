import { afterEach, describe, expect, it, vi } from 'vitest'
import { readWikipediaSummary } from './wikipedia-summary'

const MELENCHON = 'https://fr.wikipedia.org/wiki/Jean-Luc_M%C3%A9lenchon'

/** What the REST API returns, in the shape observed on fr.wikipedia.org */
const summary = {
  type: 'standard',
  title: 'Jean-Luc Mélenchon',
  description: 'homme politique français',
  extract:
    'Jean-Luc Mélenchon, né le 19 août 1951 à Tanger au Maroc, est un homme politique français.',
}

function answering(answer: { status: number; body?: unknown }) {
  const fetching = vi.fn(
    async () =>
      new Response(answer.body === undefined ? '' : JSON.stringify(answer.body), {
        status: answer.status,
      }),
  )
  vi.stubGlobal('fetch', fetching)
  return fetching
}

afterEach(() => vi.unstubAllGlobals())

describe('readWikipediaSummary', () => {
  it('returns the title and the summary of the page', async () => {
    answering({ status: 200, body: summary })

    await expect(readWikipediaSummary(MELENCHON)).resolves.toEqual({
      found: true,
      name: 'Jean-Luc Mélenchon',
      presentation:
        'Jean-Luc Mélenchon, né le 19 août 1951 à Tanger au Maroc, est un homme politique français.',
    })
  })

  /*
   * The title travels as the address holds it, underscores included: the REST
   * API accepts them (checked against the live one) and returns the title
   * normalised with its spaces, which is the one copied into the form.
   */
  it('asks for the summary of the title the address holds', async () => {
    const fetching = answering({ status: 200, body: summary })

    await readWikipediaSummary(MELENCHON)

    const [[asked]] = fetching.mock.calls as unknown as [[string]]
    expect(asked).toBe('https://fr.wikipedia.org/api/rest_v1/page/summary/Jean-Luc_M%C3%A9lenchon')
  })

  /*
   * The one gate between a contributor's text and an outgoing request: the
   * address is taken apart, never fetched as given. Without this refusal the
   * server would fetch whatever it is pointed at — an intranet, the host's
   * metadata endpoint.
   */
  it('refuses what is not a Wikipedia page address, without calling anyone', async () => {
    const fetching = answering({ status: 200, body: summary })

    for (const url of [
      'https://example.org/wiki/Something',
      'http://169.254.169.254/latest/meta-data/',
      'https://fr.wikipedia.org.attacker.example/wiki/X',
      'https://fr.wikipedia.org/w/index.php?title=X',
      '',
    ]) {
      await expect(readWikipediaSummary(url)).resolves.toEqual({
        found: false,
        reason: 'not_wikipedia',
      })
    }

    expect(fetching).not.toHaveBeenCalled()
  })

  it('says a disambiguation page is not one to copy', async () => {
    answering({
      status: 200,
      body: { type: 'disambiguation', title: 'Martin', extract: 'Martin est un nom propre.' },
    })

    await expect(readWikipediaSummary('https://fr.wikipedia.org/wiki/Martin')).resolves.toEqual({
      found: false,
      reason: 'ambiguous',
    })
  })

  it('says a missing title is missing', async () => {
    answering({ status: 404, body: { type: 'Internal error' } })

    await expect(readWikipediaSummary(MELENCHON)).resolves.toEqual({
      found: false,
      reason: 'not_a_page',
    })
  })

  it('says a page without a title gave nothing', async () => {
    answering({ status: 200, body: { type: 'standard' } })

    await expect(readWikipediaSummary(MELENCHON)).resolves.toEqual({
      found: false,
      reason: 'not_a_page',
    })
  })

  it('returns the title alone when the page has no summary', async () => {
    answering({ status: 200, body: { type: 'standard', title: 'Jean-Luc Mélenchon' } })

    await expect(readWikipediaSummary(MELENCHON)).resolves.toEqual({
      found: true,
      name: 'Jean-Luc Mélenchon',
      presentation: '',
    })
  })

  it('tells an outage apart from a missing title', async () => {
    answering({ status: 503 })

    await expect(readWikipediaSummary(MELENCHON)).resolves.toEqual({
      found: false,
      reason: 'unreachable',
    })
  })

  it('does not let a network error through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('The operation was aborted due to timeout')
      }),
    )

    await expect(readWikipediaSummary(MELENCHON)).resolves.toEqual({
      found: false,
      reason: 'unreachable',
    })
  })

  it('does not let an unreadable body through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not json', { status: 200 })),
    )

    await expect(readWikipediaSummary(MELENCHON)).resolves.toEqual({
      found: false,
      reason: 'unreachable',
    })
  })
})
