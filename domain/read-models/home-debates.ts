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
  /** Statements added since the instant the page counts recent ones from */
  recentStatementsCount: number
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
 * Below this many voices the home page neither details a subject as the
 * subject of the day nor compares how it leans: its bar would weigh two or
 * three people, and one of its leading positions would often have nobody to
 * quote.
 */
export const MIN_VOICES_TO_COMPARE = 10

const comparable = (debate: Debate): boolean => debate.voices >= MIN_VOICES_TO_COMPARE

/**
 * How far back the home page looks for what was just added. The page words it
 * « cette semaine » (`app/MovingDebates`): the two change together.
 */
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
  dailyPick(debates.filter(comparable), (debate) => debate.id, today)

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

/** The subjects statements were just added to, the busiest first, then the most spoken on */
export const movingDebates = (debates: readonly Debate[], limit: number): Debate[] =>
  debates
    .filter((debate) => debate.recentStatementsCount > 0)
    .sort((a, b) => b.recentStatementsCount - a.recentStatementsCount || b.voices - a.voices)
    .slice(0, limit)

/** Where a subject leans: its most supported position, and how far ahead it is */
export interface DebateLead {
  position: DebatePosition
  /** The part of the subject's voices that took this position, between 0 and 1 */
  share: number
  /** How many positions gather as many voices as this one, itself included */
  tied: number
}

/**
 * The lead of a subject, measured on its voices: an author who took two
 * positions is still one voice of the subject, so the part reads « 15 voices
 * out of 19 took this position ».
 */
export function leadOf(debate: Debate): DebateLead | null {
  const [position, ...others] = heldPositions(debate)
  if (!position) return null
  return {
    position,
    share: position.voices / debate.voices,
    tied: 1 + others.filter((other) => other.voices === position.voices).length,
  }
}

/** The subjects where voices spread, and those where they lean, never the same on both sides */
export interface DebateLeanings {
  /** The least leaning first */
  split: Debate[]
  /** The most leaning first */
  settled: Debate[]
}

/**
 * Sets apart the subjects whose voices spread over several positions from
 * those where one position gathers most of them. Only subjects enough voices
 * spoke on, with at least two positions taken, are compared. When too few can
 * be compared to fill both sides, the less leaning half goes to `split`.
 */
export function debateLeanings(debates: readonly Debate[], limit: number): DebateLeanings {
  const ranked = debates
    .filter((debate) => comparable(debate) && heldPositions(debate).length > 1)
    .map((debate) => ({ debate, share: leadOf(debate)?.share ?? 0 }))
    .sort((a, b) => a.share - b.share || a.debate.title.localeCompare(b.debate.title, 'fr'))
    .map(({ debate }) => debate)
  const split = ranked.slice(0, Math.min(limit, Math.ceil(ranked.length / 2)))
  const settled = ranked.slice(split.length).reverse().slice(0, limit)
  return { split, settled }
}

/** The subjects opened last, newest first */
export const newestDebates = (debates: readonly Debate[], limit: number): Debate[] =>
  [...debates].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
