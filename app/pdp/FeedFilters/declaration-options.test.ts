import { describe, expect, it } from 'vitest'
import { declarationOptions, UNKNOWN_DECLARATION } from './declaration-options'

const signed = { slug: 'manifeste-de-paris', title: 'Le Manifeste de Paris', signatures: 3 }
const unsigned = { slug: 'appel-de-lyon', title: 'Appel de Lyon', signatures: 0 }

describe('declarationOptions', () => {
  it('offers the texts that have a signature', () => {
    expect(declarationOptions([signed, unsigned])).toEqual([
      { slug: 'manifeste-de-paris', title: 'Le Manifeste de Paris' },
    ])
  })

  it('offers a text whose signatures were not counted', () => {
    expect(declarationOptions([{ slug: 'tribune', title: 'Tribune' }])).toEqual([
      { slug: 'tribune', title: 'Tribune' },
    ])
  })

  it('keeps the text the feed is narrowed to, even without a signature', () => {
    expect(declarationOptions([signed, unsigned], 'appel-de-lyon')).toEqual([
      { slug: 'manifeste-de-paris', title: 'Le Manifeste de Paris' },
      { slug: 'appel-de-lyon', title: 'Appel de Lyon' },
    ])
  })

  it('shows a slug no text bears as the filter it is', () => {
    expect(declarationOptions([signed], 'inconnu')).toEqual([
      { slug: 'manifeste-de-paris', title: 'Le Manifeste de Paris' },
      { slug: 'inconnu', title: UNKNOWN_DECLARATION },
    ])
  })

  it('offers nothing when there is nothing to narrow to', () => {
    expect(declarationOptions([unsigned])).toEqual([])
  })
})
