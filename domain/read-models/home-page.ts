import { StatementWithAuthor } from '../repositories/statement-repository'
import { PublicFigureActivitySummary } from '../value-objects/public-figure-activity-summary'
import { Debate } from './home-debates'
import { JointDeclarationSummary } from './joint-declaration'
import { FeedEntry } from './feed-entries'
import { orderByEngagement, OrganisationSummary } from './organisation-summary'
import { bySpokenLately, spokenLatelyOn } from './spoken-lately'

/** How many faces a row of the shelf of public figures holds at its widest */
export const FIGURES_PER_ROW = 8

/** How many cards a row of the shelf of organisations holds at its widest */
export const ORGANISATIONS_PER_ROW = 3

/**
 * How much of each of its four shelves the home page shows: a glimpse of the
 * subjects, the public figures, the organisations and the joint declarations,
 * each leading to its own index. The public figures and the organisations
 * fill two rows at most.
 */
export const HOME_SHELVES = {
  subjects: 3,
  publicFigures: 2 * FIGURES_PER_ROW,
  organisations: 2 * ORGANISATIONS_PER_ROW,
  declarations: 3,
} as const

/**
 * What a shelf shows of a ranking: full rows only — what would start a row is
 * left out —, or the few there are when they do not fill one.
 */
const inFullRows = <Shown>(ranked: Shown[], perRow: number): Shown[] => {
  const full = ranked.length - (ranked.length % perRow)
  return full > 0 ? ranked.slice(0, full) : ranked
}

/**
 * How many entries the rail of the last statements is given: more than it
 * shows beside a short subject of the day, enough beside a long one.
 */
export const HOME_LATEST_STATEMENTS = 12

/**
 * The public figures who spoke on the most subjects lately
 * (`spoken-lately.ts`): the faces the home page opens its public figures
 * with. `lately` counts, for each, the subjects of the positions she took
 * lately; one who said nothing lately is not shown. Those who spoke on as
 * many subjects read from the most documented on the site. The shelf shows
 * full rows only: faces that would start a row are left out.
 */
export function mostSpokenFigures(
  figures: readonly PublicFigureActivitySummary[],
  lately: ReadonlyMap<string, number>,
  limit: number,
): PublicFigureActivitySummary[] {
  const spokenFirst = bySpokenLately(lately)
  const ranked = figures
    .filter((figure) => spokenLatelyOn(lately, figure) > 0)
    .sort(
      (a, b) =>
        spokenFirst(a, b) ||
        b.subjectsCount - a.subjectsCount ||
        b.statementsCount - a.statementsCount ||
        a.name.localeCompare(b.name, 'fr'),
    )
    .slice(0, limit)
  return inFullRows(ranked, FIGURES_PER_ROW)
}

/**
 * The organisations that spoke on the most subjects lately: the ones the home
 * page opens its organisations with, read as its public figures are. Those
 * that spoke on as many subjects read from the most engaged in the debate,
 * as their index ranks them.
 */
export function mostSpokenOrganisations(
  organisations: OrganisationSummary[],
  lately: ReadonlyMap<string, number>,
  limit: number,
): OrganisationSummary[] {
  // Sorting keeps the order of those it compares equal: the most engaged stay first
  const ranked = orderByEngagement(organisations)
    .filter((organisation) => spokenLatelyOn(lately, organisation) > 0)
    .sort(bySpokenLately(lately))
    .slice(0, limit)
  return inFullRows(ranked, ORGANISATIONS_PER_ROW)
}

/** The subject of the day as the home page details it */
export interface DailySubject {
  debate: Debate
  /** The last words said for each of its two leading positions, when there are any */
  quotes: StatementWithAuthor[]
}

/** A shelf of the home page: the few it shows, and how many its index holds */
export interface Glimpse<Shown> {
  shown: Shown[]
  total: number
}

/** Everything the home page shows, read in one go */
export interface HomePage {
  /** Null while no subject has gathered enough voices */
  daily: DailySubject | null
  /** The last statements of the whole site, newest stated first, the signatures of a text gathered */
  latest: FeedEntry[]
  /** The subjects the most voices spoke on in the last thirty days, without the subject of the day */
  subjects: Glimpse<Debate>
  /** The public figures who spoke on the most subjects in the last thirty days */
  publicFigures: Glimpse<PublicFigureActivitySummary>
  /** The organisations that spoke on the most subjects in the last thirty days */
  organisations: Glimpse<OrganisationSummary>
  /** The latest joint declarations */
  declarations: Glimpse<JointDeclarationSummary>
}
