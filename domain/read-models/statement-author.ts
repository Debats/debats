import { StatementAuthorKind } from '../entities/statement'

/**
 * Who took position, as the read side needs it: enough to show an avatar or a
 * logo, a name, and to link to the author's page.
 */
export interface StatementAuthorRef {
  kind: StatementAuthorKind
  id: string
  name: string
  slug: string
  /** Organisations only; null for a public figure */
  acronym: string | null
}

export const publicFigureRef = (figure: {
  id: string
  name: string
  slug: string
}): StatementAuthorRef => ({ kind: 'public_figure', acronym: null, ...figure })

export const organisationRef = (organisation: {
  id: string
  name: string
  slug: string
  acronym: string | null
}): StatementAuthorRef => ({ kind: 'organisation', ...organisation })

/** The author's own page */
export const authorHref = (author: StatementAuthorRef): string =>
  author.kind === 'organisation' ? `/o/${author.slug}` : `/p/${author.slug}`

/**
 * The author's positions on a subject. A public figure has a dedicated page;
 * an organisation does not yet, its own page lists its statements by subject.
 */
export const authorOnSubjectHref = (author: StatementAuthorRef, subjectSlug: string): string =>
  author.kind === 'organisation' ? `/o/${author.slug}` : `/p/${author.slug}/s/${subjectSlug}`
