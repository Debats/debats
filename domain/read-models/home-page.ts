import {
  StatementWithAuthor,
  StatementWithAuthorAndSubject,
} from '../repositories/statement-repository'
import { Debate, SiteFigures } from './home-debates'
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
  /** The last statements of the whole site, newest stated first */
  latest: StatementWithAuthorAndSubject[]
}
