import { PositionFate } from '../aggregates/subject-events'
import { subjectHref } from './hrefs'

/**
 * The page that merges a subject into another: `/s/<the one that disappears>/fusionner`,
 * then `?dans=<the one that remains>` once it is chosen.
 */
export const subjectMergeHref = (slug: string, intoSlug?: string): string =>
  `${subjectHref(slug)}/fusionner${intoSlug ? `?dans=${encodeURIComponent(intoSlug)}` : ''}`

/** The slug of the subject chosen to remain, as the address carries it; never the subject itself */
export const parseMergeTarget = (
  param: string | string[] | undefined,
  slug: string,
): string | null => (typeof param === 'string' && param !== '' && param !== slug ? param : null)

type SluggedPosition = { id: string; slug: string }

/**
 * The fate the merge page proposes for each position of the subject that
 * disappears: folded into its namesake on the subject that remains — it
 * could not be carried over beside it — and carried over otherwise. The
 * contributor then decides.
 */
export const proposedFates = (
  absorbed: readonly SluggedPosition[],
  kept: readonly SluggedPosition[],
): PositionFate[] =>
  absorbed.map((position) => {
    const namesake = kept.find((own) => own.slug === position.slug)
    return namesake ? { positionId: position.id, into: namesake.id } : { positionId: position.id }
  })
