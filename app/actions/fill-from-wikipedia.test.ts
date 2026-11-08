import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authenticated = vi.hoisted(() => vi.fn())
const summary = vi.hoisted(() => vi.fn())

vi.mock('./get-authenticated-contributor', () => ({
  getAuthenticatedContributor: authenticated,
}))
vi.mock('../../infra/wikipedia/wikipedia-summary', () => ({
  readWikipediaSummary: summary,
}))

import { NOT_AN_ARTICLE } from '../../domain/use-cases/notoriety'
import { fillFromWikipedia } from './fill-from-wikipedia'

const PAGE = 'https://fr.wikipedia.org/wiki/Marine_Tondelier'

beforeEach(() => {
  authenticated.mockResolvedValue({ id: 'abc', reputation: 100 })
  summary.mockResolvedValue({ found: true, name: 'Marine Tondelier', presentation: 'Une élue.' })
})

afterEach(() => vi.clearAllMocks())

describe('fillFromWikipedia', () => {
  it('hands over what the page says', async () => {
    await expect(fillFromWikipedia(PAGE)).resolves.toEqual({
      found: true,
      name: 'Marine Tondelier',
      presentation: 'Une élue.',
    })
  })

  /*
   * This is the one action of the site that sends a request out of the server.
   * Without the gate, anyone could have it fetch pages on their behalf — and
   * the only reason to call it is to fill a contribution form.
   */
  it('reads nothing at all for a visitor who is not signed in', async () => {
    authenticated.mockResolvedValue(null)

    await expect(fillFromWikipedia(PAGE)).resolves.toEqual({
      found: false,
      message: expect.stringContaining('Reconnectez-vous'),
    })
    expect(summary).not.toHaveBeenCalled()
  })

  it('says in words what the page could not give, reason by reason', async () => {
    const said = async (reason: string) => {
      summary.mockResolvedValue({ found: false, reason })
      const result = await fillFromWikipedia(PAGE)
      return result.found ? '' : result.message
    }

    expect(await said('not_wikipedia')).toContain('adresse de page Wikipédia')
    expect(await said('not_a_page')).toContain('n’existe pas')
    expect(await said('not_an_article')).toContain('n’est pas un article Wikipédia')
    expect(await said('ambiguous')).toContain('homonymie')
    expect(await said('unreachable')).toContain('n’a pas répondu')
  })

  /* The same rule, said by the command and by the fill: one clause, two offers */
  it('reuses the domain’s clause for a page that is not an article', async () => {
    summary.mockResolvedValue({ found: false, reason: 'not_an_article' })

    const result = await fillFromWikipedia(PAGE)

    expect(result.found).toBe(false)
    expect(result.found === false && result.message.startsWith(NOT_AN_ARTICLE)).toBe(true)
  })
})
