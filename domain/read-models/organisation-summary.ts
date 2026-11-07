import {
  ORGANISATION_TYPES,
  ORGANISATION_TYPE_PLURAL_LABELS,
  ORGANISATION_TYPE_SLUGS,
  OrganisationType,
  pluralTypeInSentence,
} from '../entities/organisation'

/** Read model for the /o index: an organisation with its activity counters. */
export interface OrganisationSummary {
  id: string
  name: string
  slug: string
  acronym: string | null
  organisationType: OrganisationType
  presentation: string
  /** Public figures currently affiliated */
  membersCount: number
  /** Statements made by the organisation itself */
  statementsCount: number
  subjectsCount: number
}

/** How many cards of one type the index shows before linking to the whole group */
export const ORGANISATIONS_PER_GROUP = 8

/** One type of organisation as the index shows it: a few cards, and where the rest lives */
export interface OrganisationTypeGroup {
  type: OrganisationType
  /** The heading of the section */
  label: string
  /** The same label as it reads inside a sentence, for the link to the whole group */
  inSentence: string
  /** The cards to show, from the most engaged to the least */
  organisations: OrganisationSummary[]
  /** How many organisations this type holds, shown or not */
  total: number
  /** The page of the whole group */
  href: string
}

/** A group the index does not show in full: it links to its page, and that page is reachable */
export const isTruncated = (group: OrganisationTypeGroup): boolean =>
  group.total > group.organisations.length

/** What an organisation brings to the debate: its own statements and its members */
const engagement = (organisation: OrganisationSummary): number =>
  organisation.statementsCount + organisation.membersCount

/** Equally engaged organisations are named in alphabetical order */
const byEngagement = (a: OrganisationSummary, b: OrganisationSummary): number =>
  engagement(b) - engagement(a) || a.name.localeCompare(b.name, 'fr')

/** The page listing every organisation of one type */
export const organisationsOfTypeHref = (type: OrganisationType): string =>
  `/o/type/${ORGANISATION_TYPE_SLUGS[type]}`

/** What the page of one type says about how many organisations it holds, and in which order */
export const organisationsOfTypeIntro = (count: number): string => {
  if (count === 0) return 'Aucune organisation de ce type n’est encore référencée.'
  if (count === 1) return 'Une seule organisation de ce type est référencée pour l’instant.'
  return `${count} organisations, des plus engagées dans le débat public aux moins.`
}

/** The given organisations, from the most engaged to the least, without touching the list */
export const orderByEngagement = (organisations: OrganisationSummary[]): OrganisationSummary[] =>
  [...organisations].sort(byEngagement)

/** The organisations of one type, from the most engaged to the least */
export const organisationsOfType = (
  organisations: OrganisationSummary[],
  type: OrganisationType,
): OrganisationSummary[] =>
  orderByEngagement(organisations.filter((o) => o.organisationType === type))

/**
 * The organisations grouped by type, in the order of the types, with no empty group,
 * each group showing its most engaged ones and counting the rest
 */
export const groupOrganisationsByType = (
  organisations: OrganisationSummary[],
  shown: number,
): OrganisationTypeGroup[] =>
  ORGANISATION_TYPES.map((type) => {
    const ofType = organisationsOfType(organisations, type)
    return {
      type,
      label: ORGANISATION_TYPE_PLURAL_LABELS[type],
      inSentence: pluralTypeInSentence(type),
      organisations: ofType.slice(0, shown),
      total: ofType.length,
      href: organisationsOfTypeHref(type),
    }
  }).filter((group) => group.total > 0)
