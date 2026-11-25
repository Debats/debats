import { StatementWithAuthor } from '../repositories/statement-repository'
import { PublicFigureActivitySummary } from '../value-objects/public-figure-activity-summary'
import { Debate } from './home-debates'
import { JointDeclarationSummary } from './joint-declaration'
import { FeedEntry } from './feed-entries'
import { OrganisationSummary } from './organisation-summary'

/**
 * How much of each of its four shelves the home page shows: a glimpse of the
 * subjects, the public figures, the organisations and the joint declarations,
 * each leading to its own index. The public figures fill two rows of eight.
 */
export const HOME_SHELVES = {
  subjects: 3,
  publicFigures: 16,
  organisations: 6,
  declarations: 3,
} as const

/**
 * How many entries the rail of the last statements is given: more than it
 * shows beside a short subject of the day, enough beside a long one.
 */
export const HOME_LATEST_STATEMENTS = 12

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
  /** The subjects the most voices spoke on, without the subject of the day */
  subjects: Glimpse<Debate>
  /** The public figures the site documents on the most subjects */
  publicFigures: Glimpse<PublicFigureActivitySummary>
  /** The organisations the most engaged in the debate */
  organisations: Glimpse<OrganisationSummary>
  /** The latest joint declarations */
  declarations: Glimpse<JointDeclarationSummary>
}
