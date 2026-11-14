import { describe, it, expect } from 'vitest'
import { feedHref, lastTouch, parseFeedParams } from './statement-feed'

describe('parseFeedParams', () => {
  it('reads nothing as the first page of everything, newest stated first', () => {
    expect(parseFeedParams({})).toEqual({ filters: {}, order: 'stated', page: 1 })
  })

  it('reads the author kind, theme, type, order and page from the URL', () => {
    expect(
      parseFeedParams({
        qui: 'organisations',
        theme: 'economie',
        type: 'vote',
        tri: 'modification',
        page: '3',
      }),
    ).toEqual({
      filters: { authorKind: 'organisation', themeSlug: 'economie', statementType: 'vote' },
      order: 'touched',
      page: 3,
    })
  })

  it('ignores what it does not know', () => {
    expect(parseFeedParams({ qui: 'robots', type: 'rumeur', tri: 'hasard', page: 'zéro' })).toEqual(
      { filters: {}, order: 'stated', page: 1 },
    )
    expect(parseFeedParams({ page: '0' }).page).toBe(1)
  })
})

describe('feedHref', () => {
  it('leaves the defaults out of the address', () => {
    expect(feedHref({}, 'stated', 1)).toBe('/prises-de-position')
  })

  it('carries every filter, the order and the page', () => {
    expect(
      feedHref(
        { authorKind: 'public_figure', themeSlug: 'economie', statementType: 'program' },
        'touched',
        2,
      ),
    ).toBe(
      '/prises-de-position?qui=personnalites&theme=economie&type=program&tri=modification&page=2',
    )
  })

  it('reads back the address it wrote', () => {
    const query = new URLSearchParams(feedHref({ themeSlug: 'ecologie' }, 'touched').split('?')[1])
    expect(parseFeedParams(Object.fromEntries(query))).toEqual({
      filters: { themeSlug: 'ecologie' },
      order: 'touched',
      page: 1,
    })
  })
})

describe('lastTouch', () => {
  const added = new Date('2026-11-02T09:00:00Z')

  it('names a statement nobody touched since as added', () => {
    expect(lastTouch({ createdAt: added, updatedAt: added })).toEqual({ kind: 'added', at: added })
  })

  it('names a statement touched since as edited, on the day it was', () => {
    const edited = new Date('2026-11-12T16:30:00Z')
    expect(lastTouch({ createdAt: added, updatedAt: edited })).toEqual({
      kind: 'edited',
      at: edited,
    })
  })
})
