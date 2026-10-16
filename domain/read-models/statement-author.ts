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

/** Only the fields of the reference are kept: a whole entity can be passed in */
export const publicFigureRef = (figure: {
  id: string
  name: string
  slug: string
}): StatementAuthorRef => ({
  kind: 'public_figure',
  id: figure.id,
  name: figure.name,
  slug: figure.slug,
  acronym: null,
})

export const organisationRef = (organisation: {
  id: string
  name: string
  slug: string
  acronym: string | null
}): StatementAuthorRef => ({
  kind: 'organisation',
  id: organisation.id,
  name: organisation.name,
  slug: organisation.slug,
  acronym: organisation.acronym,
})

/** The author's own page */
export const authorHref = (author: StatementAuthorRef): string =>
  author.kind === 'organisation' ? `/o/${author.slug}` : `/p/${author.slug}`

/** The author's positions on a subject */
export const authorOnSubjectHref = (author: StatementAuthorRef, subjectSlug: string): string =>
  `${authorHref(author)}/s/${subjectSlug}`
