import { dailyPick } from '../services/daily-pick'

/** A position as the home page counts it: how many voices took it */
export interface DebatePosition {
  id: string
  title: string
  slug: string
  /** Distinct authors, public figures and organisations alike */
  voices: number
}

/**
 * A subject as the home page reads it: who spoke, and how the voices spread
 * over its positions. One list of these feeds every block of the page that
 * compares subjects, so the page reads them once.
 */
export interface Debate {
  id: string
  title: string
  slug: string
  problem: string
  createdAt: Date
  /** Distinct authors on the subject: one who took two positions is one voice */
  voices: number
  statementsCount: number
  positions: DebatePosition[]
}

/** One segment of a subject's bar: the shape `components/charts/ShareBar` draws */
export interface DebateShare {
  key: string
  label: string
  /** The position's own slug, to link to its page under its subject */
  slug: string
  count: number
  /** Between 0 and 1 */
  share: number
}

/** The site's content, counted: the figures under the home page's title */
export interface SiteFigures {
  subjects: number
  positions: number
  statements: number
  publicFigures: number
  organisations: number
  sources: number
}

/**
 * Below this many voices a subject is not shown as the subject of the day:
 * its bar would compare two or three people, and one of its leading positions
 * would often have nobody to quote.
 */
export const DAILY_MIN_VOICES = 10

/** How far back the home page looks for what was just added */
const RECENT_DAYS = 7

/** The instant the home page counts recent statements from, given when it renders */
export const recentSince = (now: Date): Date =>
  new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000)

/**
 * The subject of the day: the same for everyone all day long, drawn among the
 * subjects enough voices spoke on. A subject that gathers its tenth voice
 * during the day joins the draw without moving it, unless it wins it.
 */
export const dailyDebate = (debates: readonly Debate[], today: Date): Debate | null =>
  dailyPick(
    debates.filter((debate) => debate.voices >= DAILY_MIN_VOICES),
    (debate) => debate.id,
    today,
  )

const bySupport = (a: DebatePosition, b: DebatePosition) =>
  b.voices - a.voices || a.title.localeCompare(b.title, 'fr')

/** The positions somebody took, most supported first */
const heldPositions = (debate: Debate): DebatePosition[] =>
  debate.positions.filter((position) => position.voices > 0).sort(bySupport)

/**
 * How the voices spread over the positions of a subject. An author who took
 * two positions weighs in both: the parts are parts of the positions taken,
 * which is why they add up to one even then.
 */
export function debateShares(debate: Debate): DebateShare[] {
  const held = heldPositions(debate)
  const total = held.reduce((sum, position) => sum + position.voices, 0)
  return held.map((position) => ({
    key: position.id,
    label: position.title,
    slug: position.slug,
    count: position.voices,
    share: position.voices / total,
  }))
}

/** The two most supported positions: the ones the home page quotes face to face */
export const leadingPositions = (debate: Debate): DebatePosition[] =>
  heldPositions(debate).slice(0, 2)

/** The subjects opened last, newest first */
export const newestDebates = (debates: readonly Debate[], limit: number): Debate[] =>
  [...debates].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
