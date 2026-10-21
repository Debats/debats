/** How an author's statements are organised: by subject, or in the order they were stated */
export type StatementsOrder = 'subject' | 'date'

/** What an author's page shows of her statements: the order, and a theme if one is chosen */
export interface StatementsView {
  order: StatementsOrder
  themeSlug?: string
}

const DATE_PARAM_VALUE = 'chronologique'

/** The view the `tri` and `theme` parameters of an author's page ask for */
export const parseStatementsView = (params: { tri?: string; theme?: string }): StatementsView => ({
  order: params.tri === DATE_PARAM_VALUE ? 'date' : 'subject',
  ...(params.theme ? { themeSlug: params.theme } : {}),
})

/** The address of an author's page for this view; the defaults stay out of it */
export function statementsViewHref(base: string, view: StatementsView): string {
  const query = new URLSearchParams()
  if (view.order === 'date') query.set('tri', DATE_PARAM_VALUE)
  if (view.themeSlug) query.set('theme', view.themeSlug)
  const search = query.toString()
  return search ? `${base}?${search}` : base
}
