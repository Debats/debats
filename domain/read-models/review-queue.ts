import { REVIEW_QUEUE_HREF } from './hrefs'

/**
 * The review queue: the statements nobody confirmed nor flagged yet, offered
 * to whoever has a few minutes, the last added first.
 */

/** How many statements a page of the queue offers */
export const REVIEW_QUEUE_PAGE_SIZE = 20

/** The page of the queue an address asks for; anything else is the first */
export function parseReviewQueuePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? '', 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

/** The address of a page of the queue */
export const reviewQueueHref = (page: number): string =>
  page > 1 ? `${REVIEW_QUEUE_HREF}?page=${page}` : REVIEW_QUEUE_HREF

/** How far a page reaches into a queue of `total` statements, and whether more follows */
export function reviewQueueRange(
  page: number,
  total: number,
): { shownUpTo: number; hasMore: boolean } {
  const shownUpTo = Math.min(page * REVIEW_QUEUE_PAGE_SIZE, total)
  return { shownUpTo, hasMore: shownUpTo < total }
}
