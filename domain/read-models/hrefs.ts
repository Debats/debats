/**
 * The address of each page of the site, written once: a link built anywhere
 * else is a link that can drift from the route that answers it.
 */

/** A subject's page */
export const subjectHref = (slug: string): string => `/s/${slug}`

/** One slide of the carousel of a subject made to be shared, as an image */
export const subjectShareSlideHref = (slug: string, slide: string): string =>
  `${subjectHref(slug)}/partage/${slide}`

/** The index of every subject */
export const SUBJECTS_HREF = '/s'

/** A position's page: its own slug under its subject's, never its id */
export const positionHref = (subjectSlug: string, positionSlug: string): string =>
  `${subjectHref(subjectSlug)}/position/${positionSlug}`

/** The index of every public figure */
export const FIGURES_HREF = '/p'

/** A public figure's page */
export const figureHref = (slug: string): string => `${FIGURES_HREF}/${slug}`

/** The index of every organisation */
export const ORGANISATIONS_HREF = '/o'

/** An organisation's page */
export const organisationHref = (slug: string): string => `${ORGANISATIONS_HREF}/${slug}`

/** The analyses of the whole site: what is compared across subjects, figures and organisations */
export const ANALYSES_HREF = '/analyses'

/** A theme's page */
export const themeHref = (slug: string): string => `/themes/${slug}`

/** The index of every argument */
export const ARGUMENTS_HREF = '/a'

/** The page of an argument */
export const argumentHref = (argument: { slug: string }): string =>
  `${ARGUMENTS_HREF}/${argument.slug}`

/** The list of the families of occupations */
export const OCCUPATIONS_HREF = '/metiers'

/** The page of a family of occupations */
export const occupationFamilyHref = (family: { slug: string }): string =>
  `${OCCUPATIONS_HREF}/${family.slug}`

/** What an author said on a subject lives under the author's own page */
const onSubject = (authorPage: string, subjectSlug: string): string =>
  `${authorPage}/s/${subjectSlug}`

/** What a public figure said on a subject */
export const figureOnSubjectHref = (figureSlug: string, subjectSlug: string): string =>
  onSubject(figureHref(figureSlug), subjectSlug)

/** What an organisation said on a subject */
export const organisationOnSubjectHref = (organisationSlug: string, subjectSlug: string): string =>
  onSubject(organisationHref(organisationSlug), subjectSlug)

/** The index of the joint declarations: tribunes, manifestos, appeals, open letters */
export const JOINT_DECLARATIONS_HREF = '/d'

/** The page of a joint declaration */
export const jointDeclarationHref = (declaration: { slug: string }): string =>
  `${JOINT_DECLARATIONS_HREF}/${declaration.slug}`

/** The form that references a new joint declaration */
export const NEW_JOINT_DECLARATION_HREF = `${JOINT_DECLARATIONS_HREF}/ajouter`

/** The feed of every statement, and the root of the pages that add or edit one */
export const STATEMENTS_HREF = '/pdp'

/** The form that adds a statement */
export const NEW_STATEMENT_HREF = `${STATEMENTS_HREF}/ajouter`

/** The statement form, opened on the signature of a joint declaration already chosen */
export const signJointDeclarationHref = (declaration: { slug: string }): string =>
  `${NEW_STATEMENT_HREF}?declaration=${declaration.slug}`

/** The form that adds a statement, its author already chosen: a personality */
export const newStatementOfFigureHref = (figure: { id: string; name: string }): string =>
  `${NEW_STATEMENT_HREF}?figureId=${figure.id}&figureName=${encodeURIComponent(figure.name)}`

/** The form that adds a statement, its author already chosen: an organisation */
export const newStatementOfOrganisationHref = (organisation: {
  id: string
  name: string
}): string =>
  `${NEW_STATEMENT_HREF}?organisationId=${organisation.id}&organisationName=${encodeURIComponent(organisation.name)}`

/** The form that says a joint declaration takes one more position */
export const takeJointPositionHref = (declaration: { slug: string }): string =>
  `${jointDeclarationHref(declaration)}/position`

/** Where a visitor learns how to contribute, and signs in to do it */
export const CONTRIBUTE_HREF = '/contribuer'

/** The queue of the statements nobody reviewed yet */
export const REVIEW_QUEUE_HREF = '/revue'

/** The form that adds a statement, the subject already chosen */
export const newStatementOnSubjectHref = (subject: { id: string; title: string }): string =>
  `${NEW_STATEMENT_HREF}?subjectId=${subject.id}&subjectTitle=${encodeURIComponent(subject.title)}`

/** The form that adds a statement, the subject and the position already chosen */
export const newStatementOnPositionHref = (
  subject: { id: string; title: string },
  position: { id: string },
): string => `${newStatementOnSubjectHref(subject)}&positionId=${position.id}`

/**
 * Where « ajouter une prise de position » leads on a subject: the form for who
 * is signed in; the page that explains how to contribute for a visitor, who
 * could not submit the form.
 */
export const addStatementHref = (
  subject: { id: string; title: string },
  signedIn: boolean,
): string => (signedIn ? newStatementOnSubjectHref(subject) : CONTRIBUTE_HREF)

/** The form that edits a statement, whoever its author */
export const statementEditHref = (statementId: string): string =>
  `${STATEMENTS_HREF}/${statementId}/modifier`

/** The form that says a statement already on the site is the signature of a joint declaration */
export const attachStatementHref = (statementId: string): string =>
  `${STATEMENTS_HREF}/${statementId}/rattacher`

/** The flags waiting for a moderator */
export const FLAGS_HREF = '/signalements'

/** Where a moderator settles the flags open on one entity, whatever its kind */
export const flaggedEntityHref = (entity: { type: string; id: string }): string =>
  `${FLAGS_HREF}/${entity.type}/${entity.id}`
