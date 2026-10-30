/** The sections of a public figure or organisation page, each at its own address */
export type AuthorTab = 'statements' | 'analyses'

export const AUTHOR_TAB_LABELS: Record<AuthorTab, string> = {
  statements: 'Prises de position',
  analyses: 'Analyses',
}

/** The statements at the author's address, the analyses under it */
export const authorTabHref = (base: string, tab: AuthorTab): string =>
  tab === 'statements' ? base : `${base}/${tab}`
