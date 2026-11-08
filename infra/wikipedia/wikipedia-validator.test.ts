import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWikipediaValidator } from './wikipedia-validator'

const CAMUS = 'https://fr.wikipedia.org/wiki/Albert_Camus'

/** An article — namespace 0 — carrying its Wikidata item */
const pageWithItem = (item: string) => ({
  query: { pages: { '1234': { ns: 0, pageprops: { wikibase_item: item } } } },
})

const missingPage = { query: { pages: { '-1': { missing: '' } } } }

const instanceOf = (id: string) => ({
  claims: { P31: [{ mainsnak: { datavalue: { value: { id } } } }] },
})

/** What each call answers, in the order the validator makes them */
function answering(...answers: ({ status: number } | object)[]) {
  const fetching = vi.fn(async () => {
    const answer = answers.shift()
    if (!answer) throw new Error('One call too many')
    if ('status' in answer && typeof answer.status === 'number') {
      return new Response('', { status: answer.status })
    }
    return new Response(JSON.stringify(answer), { status: 200 })
  })
  vi.stubGlobal('fetch', fetching)
  return fetching
}

afterEach(() => vi.unstubAllGlobals())

describe('createWikipediaValidator', () => {
  it('reads a human as a biography', async () => {
    answering(pageWithItem('Q991'), instanceOf('Q5'))

    await expect(createWikipediaValidator().validatePage(CAMUS)).resolves.toEqual({
      exists: true,
      isArticle: true,
      isBiography: true,
    })
  })

  it('reads anything else as not a biography', async () => {
    answering(pageWithItem('Q42756'), instanceOf('Q7278'))

    await expect(createWikipediaValidator().validatePage(CAMUS)).resolves.toEqual({
      exists: true,
      isArticle: true,
      isBiography: false,
    })
  })

  /*
   * A category has a Wikidata item of its own — « Catégorie:Femme politique
   * française » is Q7039440, instance of « Wikimedia category » — so asking
   * Wikidata about it answers « not a person », which used to satisfy an
   * organisation's notoriety criterion. The namespace says it first, and the
   * answer is already in the response we have.
   */
  it('reads a category, a portal or a talk page as not an article', async () => {
    for (const ns of [14, 100, 1]) {
      answering({ query: { pages: { '1234': { ns, pageprops: { wikibase_item: 'Q7039440' } } } } })

      await expect(
        createWikipediaValidator().validatePage('https://fr.wikipedia.org/wiki/Cat%C3%A9gorie:X'),
      ).resolves.toEqual({ exists: true, isArticle: false, isBiography: false })
    }
  })

  it('fails rather than guess when Wikipedia does not say the namespace', async () => {
    answering({ query: { pages: { '1234': { pageprops: { wikibase_item: 'Q991' } } } } })

    await expect(createWikipediaValidator().validatePage(CAMUS)).rejects.toThrow('namespace')
  })

  it('reports a title Wikipedia does not hold as absent', async () => {
    answering(missingPage)

    await expect(createWikipediaValidator().validatePage(CAMUS)).resolves.toEqual({
      exists: false,
      isArticle: false,
      isBiography: false,
    })
  })

  /*
   * The three refusals below are the point of this file. Each used to answer
   * « exists: false » or « isBiography: false », which the domain reads as a
   * verdict: a personality refused because Wikipedia was down, and an
   * organisation accepted although its page describes a person. Failing lets
   * the domain apply its own rule — an unjudged URL goes through.
   */
  it('fails rather than call a page absent when Wikipedia is down', async () => {
    answering({ status: 503 })

    await expect(createWikipediaValidator().validatePage(CAMUS)).rejects.toThrow('503')
  })

  it('fails rather than judge when Wikidata is down', async () => {
    answering(pageWithItem('Q991'), { status: 500 })

    await expect(createWikipediaValidator().validatePage(CAMUS)).rejects.toThrow('500')
  })

  it('fails when the page carries no Wikidata item: nothing says what it describes', async () => {
    answering({ query: { pages: { '1234': { ns: 0 } } } })

    await expect(createWikipediaValidator().validatePage(CAMUS)).rejects.toThrow('No Wikidata item')
  })

  it('fails when Wikidata claims nothing about what the item is', async () => {
    answering(pageWithItem('Q991'), { claims: {} })

    await expect(createWikipediaValidator().validatePage(CAMUS)).rejects.toThrow('says nothing')
  })

  it('fails when the call itself fails, rather than resolve to a verdict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('The operation was aborted due to timeout')
      }),
    )

    await expect(createWikipediaValidator().validatePage(CAMUS)).rejects.toThrow('timeout')
  })

  it('gives up on an answer rather than wait on it', async () => {
    const fetching = answering(pageWithItem('Q991'), instanceOf('Q5'))

    await createWikipediaValidator().validatePage(CAMUS)

    for (const [, init] of fetching.mock.calls as unknown as [string, RequestInit][]) {
      expect(init.signal).toBeInstanceOf(AbortSignal)
    }
  })

  /*
   * A redirect is a page like any other to this API: it exists and carries no
   * Wikidata item, so without `redirects=1` the validator concluded it could
   * not tell, and « Europe Écologie Les Verts » — which now redirects to
   * « Les Écologistes » — was answered with « retry in a moment », forever.
   */
  it('follows a redirect rather than fail to tell on a renamed entity', async () => {
    /*
     * Answers like the real API: asked without `redirects=1`, it hands back
     * the redirect page itself — ns 0, not missing, and no Wikidata item.
     * The validator reads that as « nothing says what this page describes ».
     */
    const fetching = vi.fn(async (url: string) => {
      if (url.includes('wikidata.org')) {
        return new Response(JSON.stringify(instanceOf('Q7278')), { status: 200 })
      }
      const body = url.includes('redirects=1')
        ? {
            query: {
              redirects: [{ from: 'Europe Écologie Les Verts', to: 'Les Écologistes' }],
              pages: { '613786': { ns: 0, pageprops: { wikibase_item: 'Q613786' } } },
            },
          }
        : { query: { pages: { '15933156': { ns: 0, title: 'Europe Écologie Les Verts' } } } }
      return new Response(JSON.stringify(body), { status: 200 })
    })
    vi.stubGlobal('fetch', fetching)

    await expect(
      createWikipediaValidator().validatePage(
        'https://fr.wikipedia.org/wiki/Europe_%C3%89cologie_Les_Verts',
      ),
    ).resolves.toEqual({ exists: true, isArticle: true, isBiography: false })

    const [[asked]] = fetching.mock.calls as unknown as [[string]]
    expect(asked).toContain('redirects=1')
  })

  it('asks Wikipedia, then Wikidata, and names itself to both', async () => {
    const fetching = answering(pageWithItem('Q991'), instanceOf('Q5'))

    await createWikipediaValidator().validatePage(CAMUS)

    const [[first, firstInit], [second, secondInit]] = fetching.mock.calls as unknown as [
      [string, RequestInit],
      [string, RequestInit],
    ]
    expect(first).toContain('fr.wikipedia.org/w/api.php')
    expect(first).toContain('Albert_Camus')
    expect(second).toContain('wikidata.org/w/api.php')
    expect(second).toContain('Q991')
    expect(firstInit.headers).toEqual({ 'User-Agent': 'Debats.co/1.0 (https://debats.co)' })
    expect(secondInit.headers).toEqual({ 'User-Agent': 'Debats.co/1.0 (https://debats.co)' })
  })
})
