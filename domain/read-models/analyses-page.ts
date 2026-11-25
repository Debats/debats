import { OccupationFamily } from '../entities/occupation-family'
import {
  agreeingPairs,
  FamilySpeakers,
  MembersCohesion,
  membersCohesion,
  OpposedPair,
  opposedPairs,
  SiteExpression,
  siteExpression,
  SiteStatement,
  speakersByFamily,
  Standings,
  standings,
} from '../services/site-analyses'
import { ArgumentSummary } from './argument'
import { FigureAgreement, MIN_SUBJECTS_TO_PAIR } from './figure-agreements'
import { Debate, DebateLeanings, debateLeanings, SiteFigures } from './home-debates'
import { latestChanges, PositionChange, StatedPosition } from './position-changes'
import { compatibilityOf, JudgedPair } from './position-judgements'
import { StatementAuthorRef } from './statement-author'

/** How many subjects the analyses show as moving */
export const MOVING_DEBATES = 3

/**
 * A public figure is ranked against everyone only once she can be compared on
 * this many subjects: on two or three, « most often » says nothing.
 */
export const MIN_SUBJECTS_TO_STAND = 10

/**
 * An organisation is set against its members only once they spoke this many
 * times on its subjects.
 */
export const MIN_MEMBER_VOICES = 5

/** How much each block of the analyses shows of what it ranks */
export const ANALYSES_SHOWN = {
  /** On each side of the shared and the settled subjects */
  leaningSubjects: 3,
  families: 8,
  arguments: 6,
  /** Agreeing pairs, and as many opposed ones */
  pairs: 4,
  /** On each side of who stands with the most supported position */
  standings: 5,
  changes: 3,
  organisations: 8,
  sources: 6,
} as const

/** A subject statements were just added to, with the first faces of who spoke on it */
export interface MovingDebate {
  debate: Debate
  faces: StatementAuthorRef[]
}

/** Everything the analyses of the whole site are folded from, as the database gives it */
export interface AnalysesMaterial {
  figures: SiteFigures
  debates: Debate[]
  /** The busiest first */
  moving: MovingDebate[]
  /** The statements of the figures who took several positions on a subject: where changes are read */
  movedStatements: StatedPosition[]
  /** Every pair of positions that was judged: compatible ones make neither a change nor a disagreement */
  judged: JudgedPair[]
  /** Every statement of the site */
  statements: SiteStatement[]
  /** Organisation id → the public figures affiliated today */
  members: Map<string, Set<string>>
  /** Public figure id → the families of her occupations */
  familiesOf: Map<string, Set<string>>
  /** In their own order */
  families: OccupationFamily[]
  /** Every argument, the most mobilised first */
  arguments: ArgumentSummary[]
}

/** Everything the analyses of the whole site show, block by block */
export interface AnalysesPage {
  leanings: DebateLeanings
  moving: MovingDebate[]
  /** The families the most heard */
  speakers: FamilySpeakers[]
  /** The arguments the most mobilised, and how many the site holds */
  arguments: { top: ArgumentSummary[]; total: number }
  agreeing: FigureAgreement[]
  opposed: OpposedPair[]
  standings: Standings
  changes: PositionChange[]
  cohesion: MembersCohesion[]
  expression: SiteExpression
  figures: SiteFigures
}

/** What the page shows of what was read: each block folded, ranked and cut to what it holds */
export function analysesOf(material: AnalysesMaterial): AnalysesPage {
  const { statements } = material
  const compatible = compatibilityOf(material.judged)
  const pairs = { minSubjects: MIN_SUBJECTS_TO_PAIR, limit: ANALYSES_SHOWN.pairs }

  return {
    leanings: debateLeanings(material.debates, ANALYSES_SHOWN.leaningSubjects),
    moving: material.moving,
    speakers: speakersByFamily(statements, material.familiesOf, material.families).slice(
      0,
      ANALYSES_SHOWN.families,
    ),
    arguments: {
      top: material.arguments
        .filter((argument) => argument.statementsCount > 0)
        .slice(0, ANALYSES_SHOWN.arguments),
      total: material.arguments.length,
    },
    agreeing: agreeingPairs(statements, compatible, pairs),
    opposed: opposedPairs(statements, compatible, pairs),
    standings: standings(statements, compatible, {
      minSubjects: MIN_SUBJECTS_TO_STAND,
      limit: ANALYSES_SHOWN.standings,
    }),
    changes: latestChanges(material.movedStatements, ANALYSES_SHOWN.changes, compatible),
    cohesion: membersCohesion(statements, material.members, compatible, {
      minVoices: MIN_MEMBER_VOICES,
      limit: ANALYSES_SHOWN.organisations,
    }),
    expression: siteExpression(statements, ANALYSES_SHOWN.sources),
    figures: material.figures,
  }
}
