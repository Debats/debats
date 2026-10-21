import { describe, it, expect } from 'vitest'
import { feedHref, parseFeedParams } from './statement-feed'

describe('parseFeedParams', () => {
  it('reads nothing as the first page of everything', () => {
    expect(parseFeedParams({})).toEqual({ filters: {}, page: 1 })
  })

  it('reads the author kind, theme, type and page from the URL', () => {
    expect(
      parseFeedParams({ qui: 'organisations', theme: 'economie', type: 'vote', page: '3' }),
    ).toEqual({
      filters: { authorKind: 'organisation', themeSlug: 'economie', statementType: 'vote' },
      page: 3,
    })
  })

  it('ignores what it does not know', () => {
    expect(parseFeedParams({ qui: 'robots', type: 'rumeur', page: 'zéro' })).toEqual({
      filters: {},
      page: 1,
    })
    expect(parseFeedParams({ page: '0' }).page).toBe(1)
  })
})

describe('feedHref', () => {
  it('leaves the defaults out of the address', () => {
    expect(feedHref({}, 1)).toBe('/prises-de-position')
  })

  it('carries every filter and the page', () => {
    expect(
      feedHref({ authorKind: 'public_figure', themeSlug: 'economie', statementType: 'program' }, 2),
    ).toBe('/prises-de-position?qui=personnalites&theme=economie&type=program&page=2')
  })
})
