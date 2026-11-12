import { Option } from 'effect'
import { Organisation } from '../entities/organisation'
import { StatementAuthorKind } from '../entities/statement'
import {
  figureHref,
  figureOnSubjectHref,
  organisationHref,
  organisationOnSubjectHref,
} from './hrefs'

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

/** The organisation entity, whose acronym is an Option, as an author */
export const organisationEntityRef = (organisation: Organisation): StatementAuthorRef =>
  organisationRef({
    id: organisation.id,
    name: organisation.name,
    slug: organisation.slug,
    acronym: Option.getOrNull(organisation.acronym),
  })

/** What an address needs of an author: which kind of page, under which slug */
export type AuthorAddress = Pick<StatementAuthorRef, 'kind' | 'slug'>

/** Where a statement stands: who made it, on which subject */
export interface StatementWhereabouts {
  author: AuthorAddress
  subjectSlug: string
}

/** The author's own page */
export const authorHref = (author: AuthorAddress): string =>
  author.kind === 'organisation' ? organisationHref(author.slug) : figureHref(author.slug)

/** The author's positions on a subject */
export const authorOnSubjectHref = (author: AuthorAddress, subjectSlug: string): string =>
  author.kind === 'organisation'
    ? organisationOnSubjectHref(author.slug, subjectSlug)
    : figureOnSubjectHref(author.slug, subjectSlug)
