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

/** The page of an argument */
export const argumentHref = (argument: { slug: string }): string => `/arguments/${argument.slug}`

/** The page of a family of occupations */
export const occupationFamilyHref = (family: { slug: string }): string => `/metiers/${family.slug}`

/** What an author said on a subject lives under the author's own page */
const onSubject = (authorPage: string, subjectSlug: string): string =>
  `${authorPage}/s/${subjectSlug}`

/** What a public figure said on a subject */
export const figureOnSubjectHref = (figureSlug: string, subjectSlug: string): string =>
  onSubject(figureHref(figureSlug), subjectSlug)

/** What an organisation said on a subject */
export const organisationOnSubjectHref = (organisationSlug: string, subjectSlug: string): string =>
  onSubject(organisationHref(organisationSlug), subjectSlug)

/** The form that edits a statement, whoever its author */
export const statementEditHref = (statementId: string): string =>
  `/prise-de-position/${statementId}/modifier`

/** The flags waiting for a moderator */
export const FLAGS_HREF = '/signalements'

/** Where a moderator settles the flags open on one entity, whatever its kind */
export const flaggedEntityHref = (entity: { type: string; id: string }): string =>
  `${FLAGS_HREF}/${entity.type}/${entity.id}`
