import { describe, expect, it } from 'vitest'
import { anotherToReviewHref, MAX_REVIEW_SKIP, parseReviewSkip } from './home-page'

describe('parseReviewSkip', () => {
  it('skips nothing unless the address asks for another statement', () => {
    expect(parseReviewSkip(undefined)).toBe(0)
  })

  it('skips as many statements as the address says', () => {
    expect(parseReviewSkip('3')).toBe(3)
  })

  it('skips nothing for what is not a count', () => {
    for (const value of ['-1', 'abc', '1.5', '']) expect(parseReviewSkip(value)).toBe(0)
  })

  it('does not walk the whole site from an address: past its bound, it starts over', () => {
    expect(parseReviewSkip(String(MAX_REVIEW_SKIP + 1))).toBe(0)
  })
})

describe('anotherToReviewHref', () => {
  it('asks the home page for the next statement, back at the block that offers it', () => {
    expect(anotherToReviewHref(0)).toBe('/?relire=1#relire')
    expect(anotherToReviewHref(4)).toBe('/?relire=5#relire')
  })

  it('leads back to the first statement once the bound is reached', () => {
    expect(anotherToReviewHref(MAX_REVIEW_SKIP)).toBe('/#relire')
  })
})
