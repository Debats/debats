/**
 * The global search, as the header field and the results page read it: one
 * hit per thing found, whatever its kind, with enough to show it and to go
 * to its page.
 */

import {
  argumentHref,
  figureHref,
  jointDeclarationHref,
  occupationFamilyHref,
  organisationHref,
  positionHref,
  subjectHref,
  themeHref,
} from './hrefs'
import { AuthorAddress, authorOnSubjectHref } from './statement-author'

export const SEARCH_HIT_KINDS = [
  'subject',
  'position',
  'public_figure',
  'organisation',
  'statement',
  'joint_declaration',
  'argument',
  'theme',
  'occupation',
] as const
export type SearchHitKind = (typeof SEARCH_HIT_KINDS)[number]

interface FoundThing {
  id: string
  title: string
  /**
   * The slug of the page the hit leads to: its own, but its author's for a
   * statement and its family's for an occupation, which have no page of their own
   */
  slug: string
  /**
   * What tells the hit apart, or what it was found through: the subject of a
   * position or of a statement, the acronym of an organisation, the family of
   * an occupation, the occupation a public figure holds, the theme of a subject
   */
  detail: string | null
  /** Where the words stand, when they were found in the long text and not in the title */
  excerpt: string | null
}

/** A hit whose slug is its whole address */
export interface PageHit extends FoundThing {
  kind: Exclude<SearchHitKind, 'position' | 'statement'>
}

/** A position has no page without its subject: its hit always carries the subject's slug */
export interface PositionHit extends FoundThing {
  kind: 'position'
  subjectSlug: string
}

/**
 * A statement has no page: it reads on the page of its author on its subject.
 * Its title is the name of its author.
 */
export interface StatementHit extends FoundThing {
  kind: 'statement'
  /** Whose page the slug is: a public figure's or an organisation's */
  authorKind: AuthorAddress['kind']
  subjectSlug: string
}

export type SearchHit = PageHit | PositionHit | StatementHit

export const SEARCH_KIND_LABELS: Record<SearchHitKind, { singular: string; plural: string }> = {
  subject: { singular: 'Sujet', plural: 'Sujets' },
  position: { singular: 'Position', plural: 'Positions' },
  public_figure: { singular: 'Personnalité', plural: 'Personnalités' },
  organisation: { singular: 'Organisation', plural: 'Organisations' },
  statement: { singular: 'Prise de position', plural: 'Prises de position' },
  joint_declaration: { singular: 'Déclaration commune', plural: 'Déclarations communes' },
  argument: { singular: 'Argument', plural: 'Arguments' },
  theme: { singular: 'Thématique', plural: 'Thématiques' },
  occupation: { singular: 'Métier', plural: 'Métiers' },
}

/** The page of a hit */
export function searchHitHref(hit: SearchHit): string {
  switch (hit.kind) {
    case 'subject':
      return subjectHref(hit.slug)
    case 'position':
      return positionHref(hit.subjectSlug, hit.slug)
    case 'public_figure':
      return figureHref(hit.slug)
    case 'organisation':
      return organisationHref(hit.slug)
    case 'statement':
      return authorOnSubjectHref({ kind: hit.authorKind, slug: hit.slug }, hit.subjectSlug)
    case 'joint_declaration':
      return jointDeclarationHref(hit)
    case 'argument':
      return argumentHref(hit)
    case 'theme':
      return themeHref(hit.slug)
    case 'occupation':
      return occupationFamilyHref(hit)
  }
}

export interface SearchGroup {
  kind: SearchHitKind
  hits: SearchHit[]
}

/** The hits by kind, in the order of the kinds, keeping each kind's order; empty kinds are left out */
export function groupSearchHits(hits: SearchHit[]): SearchGroup[] {
  return SEARCH_HIT_KINDS.flatMap((kind) => {
    const ofKind = hits.filter((hit) => hit.kind === kind)
    return ofKind.length > 0 ? [{ kind, hits: ofKind }] : []
  })
}

/** A query is at least this long once trimmed; shorter ones search nothing */
export const MIN_QUERY_LENGTH = 2
/** Beyond this, the rest is dropped: a search is a few words */
export const MAX_QUERY_LENGTH = 100

/** What the user typed, as the search takes it: trimmed, bounded; null when too short */
export function parseSearchQuery(raw: string | undefined | null): string | null {
  const query = (raw ?? '').trim().slice(0, MAX_QUERY_LENGTH)
  return query.length >= MIN_QUERY_LENGTH ? query : null
}

/** The results page for a query */
export const searchHref = (query: string): string =>
  `/recherche?q=${encodeURIComponent(query.trim())}`
