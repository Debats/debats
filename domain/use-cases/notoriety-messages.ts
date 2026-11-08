/*
 * What the site says about a Wikipedia page, where two places say the same
 * thing about it.
 *
 * This file imports nothing, on purpose: the rule that refuses a contribution
 * lives in `notoriety.ts`, which carries Effect and the validator's port, and
 * the form that offers to fill itself from a page is a client component. Both
 * need this sentence, and neither should drag the other's dependencies along
 * to get it.
 *
 * Only what is literally the same fact belongs here. The two messages about a
 * page that could not be checked are not: the command cannot tell for reasons
 * beyond silence — Wikidata, a namespace Wikipedia did not state — while the
 * fill only ever means « it did not answer ». Flattening them would make one
 * of the two less true.
 */

/**
 * A page that exists and describes no subject. Wikipedia serves categories,
 * portals and talk pages under the same `/wiki/` addresses; what follows this
 * clause is what each caller can do about it.
 */
export const NOT_AN_ARTICLE =
  'Cette adresse n’est pas un article Wikipédia (catégorie, portail, page de discussion…).'
