import { STATEMENT_TYPES, StatementAuthorKind, StatementType } from '../entities/statement'

/** What narrows the feed of statements */
export interface FeedFilters {
  authorKind?: StatementAuthorKind
  themeSlug?: string
  statementType?: StatementType
}

export const FEED_PAGE_SIZE = 20

export const FEED_PATH = '/prises-de-position'

/** Value of the `qui` parameter for each kind of author, as the subject page spells it */
const AUTHOR_KIND_PARAMS: Record<StatementAuthorKind, string> = {
  public_figure: 'personnalites',
  organisation: 'organisations',
}

const authorKindOf = (value: string | undefined): StatementAuthorKind | undefined =>
  (Object.keys(AUTHOR_KIND_PARAMS) as StatementAuthorKind[]).find(
    (kind) => AUTHOR_KIND_PARAMS[kind] === value,
  )

const statementTypeOf = (value: string | undefined): StatementType | undefined =>
  STATEMENT_TYPES.find((type) => type === value)

/** The filters and page an address asks for; unknown values fall back to everything */
export function parseFeedParams(params: {
  qui?: string
  theme?: string
  type?: string
  page?: string
}): { filters: FeedFilters; page: number } {
  const authorKind = authorKindOf(params.qui)
  const statementType = statementTypeOf(params.type)
  const page = Number.parseInt(params.page ?? '', 10)
  return {
    filters: {
      ...(authorKind ? { authorKind } : {}),
      ...(params.theme ? { themeSlug: params.theme } : {}),
      ...(statementType ? { statementType } : {}),
    },
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** The address of the feed with these filters, on this page */
export function feedHref(filters: FeedFilters, page = 1): string {
  const query = new URLSearchParams()
  if (filters.authorKind) query.set('qui', AUTHOR_KIND_PARAMS[filters.authorKind])
  if (filters.themeSlug) query.set('theme', filters.themeSlug)
  if (filters.statementType) query.set('type', filters.statementType)
  if (page > 1) query.set('page', String(page))
  const search = query.toString()
  return search ? `${FEED_PATH}?${search}` : FEED_PATH
}
