import {
  StatementWithAuthor,
  StatementWithAuthorAndSubject,
} from '../repositories/statement-repository'
import { FigureAgreement } from './figure-agreements'
import { Debate, SiteFigures } from './home-debates'
import { StatedPosition } from './position-changes'
import { StatementAuthorRef } from './statement-author'
import { PositionSummary } from './subject-positions-summary'

/**
 * How many faces each position of the subject of the day shows at most: the
 * page reads that many authors and the stack draws that many, so a position
 * six voices took shows the six of them rather than five and a « +1 ».
 */
export const DAILY_FACES = 6

/** How many subjects the home page shows as moving */
export const MOVING_DEBATES = 3

/** Where the block that offers a statement to review sits on the home page */
export const REVIEW_ANCHOR = 'relire'

/** How far « une autre » walks down the unreviewed statements before starting over */
export const MAX_REVIEW_SKIP = 50

/** How many unreviewed statements the address asks to pass over; anything else is none */
export function parseReviewSkip(value: string | undefined): number {
  if (value === undefined || !/^\d+$/.test(value)) return 0
  const skip = Number(value)
  return skip <= MAX_REVIEW_SKIP ? skip : 0
}

/** The address of the home page offering the statement after this one */
export const anotherToReviewHref = (skip: number): string =>
  skip < MAX_REVIEW_SKIP ? `/?relire=${skip + 1}#${REVIEW_ANCHOR}` : `/#${REVIEW_ANCHOR}`

/** The subject of the day as the home page details it */
export interface DailySubject {
  debate: Debate
  /** Its positions, most supported first, with the first faces of each */
  positions: PositionSummary[]
  /** The last words said for each of its two leading positions, when there are any */
  quotes: StatementWithAuthor[]
}

/** A subject statements were just added to, with the first faces of who spoke on it */
export interface MovingDebate {
  debate: Debate
  faces: StatementAuthorRef[]
}

/** Everything the home page shows, read in one go */
export interface HomePage {
  figures: SiteFigures
  debates: Debate[]
  /** Null while no subject has gathered enough voices */
  daily: DailySubject | null
  /** The busiest first */
  moving: MovingDebate[]
  /** The pairs of public figures agreeing on the most subjects: more than the page shows */
  agreements: FigureAgreement[]
  /** The statements of the figures who took several positions on a subject: where changes are read */
  movedStatements: StatedPosition[]
  /** A statement nobody reviewed yet, offered to whoever looks; null when all were */
  toReview: StatementWithAuthorAndSubject | null
  /** The last statements of the whole site, newest stated first */
  latest: StatementWithAuthorAndSubject[]
}
