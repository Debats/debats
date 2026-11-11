/**
 * The global search, as the header field and the results page read it: one
 * hit per thing found, whatever its kind, with enough to show it and to go
 * to its page.
 */

import { argumentHref } from './argument'
import { figureHref, organisationHref, positionHref, subjectHref, themeHref } from './hrefs'

export const SEARCH_HIT_KINDS = [
  'subject',
  'position',
  'public_figure',
  'organisation',
  'argument',
  'theme',
] as const
export type SearchHitKind = (typeof SEARCH_HIT_KINDS)[number]

interface FoundThing {
  id: string
  title: string
  /** The slug of the hit itself */
  slug: string
  /** What tells the hit apart: the subject of a position, the acronym of an organisation */
  detail: string | null
}

/** A hit whose slug is its whole address */
export interface PageHit extends FoundThing {
  kind: Exclude<SearchHitKind, 'position'>
}

/** A position has no page without its subject: its hit always carries the subject's slug */
export interface PositionHit extends FoundThing {
  kind: 'position'
  subjectSlug: string
}

export type SearchHit = PageHit | PositionHit

export const SEARCH_KIND_LABELS: Record<SearchHitKind, { singular: string; plural: string }> = {
  subject: { singular: 'Sujet', plural: 'Sujets' },
  position: { singular: 'Position', plural: 'Positions' },
  public_figure: { singular: 'Personnalité', plural: 'Personnalités' },
  organisation: { singular: 'Organisation', plural: 'Organisations' },
  argument: { singular: 'Argument', plural: 'Arguments' },
  theme: { singular: 'Thématique', plural: 'Thématiques' },
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
    case 'argument':
      return argumentHref(hit)
    case 'theme':
      return themeHref(hit.slug)
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
