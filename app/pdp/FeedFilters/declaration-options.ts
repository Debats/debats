/** A joint declaration as the feed may be narrowed to it */
export interface FeedDeclaration {
  slug: string
  title: string
  /** How many signatures the site holds of it; left out when the caller did not count them */
  signatures?: number
}

export const UNKNOWN_DECLARATION = 'Déclaration commune introuvable'

/**
 * The texts the feed offers to narrow to, and the one it is narrowed to.
 *
 * A text nobody is recorded as signing leads to an empty feed: it is not
 * offered. But the filter the address carries is always shown, whatever it
 * names — a text without a signature, or a slug no text bears — so a reader
 * looking at an empty feed sees what empties it, and can take it off.
 */
export function declarationOptions(
  declarations: readonly FeedDeclaration[],
  chosenSlug?: string,
): { slug: string; title: string }[] {
  const offered = declarations
    .filter((declaration) => declaration.signatures !== 0 || declaration.slug === chosenSlug)
    .map(({ slug, title }) => ({ slug, title }))
  return !chosenSlug || offered.some((declaration) => declaration.slug === chosenSlug)
    ? offered
    : [...offered, { slug: chosenSlug, title: UNKNOWN_DECLARATION }]
}
