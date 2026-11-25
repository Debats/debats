import { describe, it, expect } from 'vitest'
import {
  parseReviewQueuePage,
  REVIEW_QUEUE_PAGE_SIZE,
  reviewQueueHref,
  reviewQueueRange,
} from './review-queue'

describe('parseReviewQueuePage', () => {
  it('opens the queue on its first page', () => {
    expect(parseReviewQueuePage(undefined)).toBe(1)
  })

  it('reads the page the address asks for', () => {
    expect(parseReviewQueuePage('3')).toBe(3)
  })

  it('falls back to the first page on anything that is not a page', () => {
    for (const value of ['0', '-2', 'abc', '']) expect(parseReviewQueuePage(value)).toBe(1)
  })
})

describe('reviewQueueHref', () => {
  it('names the first page without a parameter', () => {
    expect(reviewQueueHref(1)).toBe('/revue')
  })

  it('names the following pages', () => {
    expect(reviewQueueHref(2)).toBe('/revue?page=2')
  })
})

describe('reviewQueueRange', () => {
  it('says how far a page reaches into the queue, and that more follows', () => {
    expect(reviewQueueRange(1, REVIEW_QUEUE_PAGE_SIZE * 2 + 5)).toEqual({
      shownUpTo: REVIEW_QUEUE_PAGE_SIZE,
      hasMore: true,
    })
  })

  it('stops at the end of the queue', () => {
    expect(reviewQueueRange(3, REVIEW_QUEUE_PAGE_SIZE * 2 + 5)).toEqual({
      shownUpTo: REVIEW_QUEUE_PAGE_SIZE * 2 + 5,
      hasMore: false,
    })
  })
})
