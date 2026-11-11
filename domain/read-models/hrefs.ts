/**
 * The address of each page of the site, written once: a link built anywhere
 * else is a link that can drift from the route that answers it.
 */

/** A subject's page */
export const subjectHref = (slug: string): string => `/s/${slug}`

/** A position's page: its own slug under its subject's, never its id */
export const positionHref = (subjectSlug: string, positionSlug: string): string =>
  `${subjectHref(subjectSlug)}/position/${positionSlug}`

/** A public figure's page */
export const figureHref = (slug: string): string => `/p/${slug}`

/** An organisation's page */
export const organisationHref = (slug: string): string => `/o/${slug}`

/** A theme's page */
export const themeHref = (slug: string): string => `/themes/${slug}`
