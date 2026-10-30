/**
 * The global search, as the header field and the results page read it: one
 * hit per thing found, whatever its kind, with enough to show it and to go
 * to its page.
 */

export const SEARCH_HIT_KINDS = [
  'subject',
  'position',
  'public_figure',
  'organisation',
  'argument',
  'theme',
] as const
export type SearchHitKind = (typeof SEARCH_HIT_KINDS)[number]

export interface SearchHit {
  kind: SearchHitKind
  id: string
  title: string
  /** The page's slug; for a position, its subject's */
  slug: string
  /** What tells the hit apart: the subject of a position, the acronym of an organisation */
  detail: string | null
}

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
      return `/s/${hit.slug}`
    case 'position':
      return `/s/${hit.slug}/position/${hit.id}`
    case 'public_figure':
      return `/p/${hit.slug}`
    case 'organisation':
      return `/o/${hit.slug}`
    case 'argument':
      return `/arguments/${hit.slug}`
    case 'theme':
      return `/themes/${hit.slug}`
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
