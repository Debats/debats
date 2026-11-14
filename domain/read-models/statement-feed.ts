import { STATEMENT_TYPES, StatementAuthorKind, StatementType } from '../entities/statement'

/** What narrows the feed of statements */
export interface FeedFilters {
  authorKind?: StatementAuthorKind
  themeSlug?: string
  statementType?: StatementType
}

/**
 * What the feed is read by: the day the opinion was stated, or the last time
 * the site touched the statement (added, edited, or moved by a merge).
 */
export type FeedOrder = 'stated' | 'touched'

export const FEED_PAGE_SIZE = 20

export const FEED_PATH = '/prises-de-position'

/** Value of the `qui` parameter for each kind of author, as the subject page spells it */
const AUTHOR_KIND_PARAMS: Record<StatementAuthorKind, string> = {
  public_figure: 'personnalites',
  organisation: 'organisations',
}

/** Value of the `tri` parameter that asks for the last touched first; the default order has none */
const TOUCHED_ORDER_PARAM = 'modification'

const authorKindOf = (value: string | undefined): StatementAuthorKind | undefined =>
  (Object.keys(AUTHOR_KIND_PARAMS) as StatementAuthorKind[]).find(
    (kind) => AUTHOR_KIND_PARAMS[kind] === value,
  )

const statementTypeOf = (value: string | undefined): StatementType | undefined =>
  STATEMENT_TYPES.find((type) => type === value)

/** The filters, order and page an address asks for; unknown values fall back to the defaults */
export function parseFeedParams(params: {
  qui?: string
  theme?: string
  type?: string
  tri?: string
  page?: string
}): { filters: FeedFilters; order: FeedOrder; page: number } {
  const authorKind = authorKindOf(params.qui)
  const statementType = statementTypeOf(params.type)
  const page = Number.parseInt(params.page ?? '', 10)
  return {
    filters: {
      ...(authorKind ? { authorKind } : {}),
      ...(params.theme ? { themeSlug: params.theme } : {}),
      ...(statementType ? { statementType } : {}),
    },
    order: params.tri === TOUCHED_ORDER_PARAM ? 'touched' : 'stated',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** The address of the feed with these filters, in this order, on this page */
export function feedHref(filters: FeedFilters, order: FeedOrder, page = 1): string {
  const query = new URLSearchParams()
  if (filters.authorKind) query.set('qui', AUTHOR_KIND_PARAMS[filters.authorKind])
  if (filters.themeSlug) query.set('theme', filters.themeSlug)
  if (filters.statementType) query.set('type', filters.statementType)
  if (order === 'touched') query.set('tri', TOUCHED_ORDER_PARAM)
  if (page > 1) query.set('page', String(page))
  const search = query.toString()
  return search ? `${FEED_PATH}?${search}` : FEED_PATH
}

/** The last time the site touched a statement: the day it was added, or a later change */
export interface StatementTouch {
  kind: 'added' | 'edited'
  at: Date
}

/** Why a statement stands where it does when the feed is read by last touch */
export function lastTouch(statement: { createdAt: Date; updatedAt: Date }): StatementTouch {
  return statement.updatedAt.getTime() > statement.createdAt.getTime()
    ? { kind: 'edited', at: statement.updatedAt }
    : { kind: 'added', at: statement.createdAt }
}
