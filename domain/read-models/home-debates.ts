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
  /** The theme the subject belongs to first; null while it has none */
  theme: DebateTheme | null
  positions: DebatePosition[]
}

/** A theme as the card of a subject names it */
export interface DebateTheme {
  name: string
  slug: string
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

/** The site's content, counted: what the home page heads its sections with, and the analyses close on */
export interface SiteFigures {
  subjects: number
  positions: number
  statements: number
  publicFigures: number
  organisations: number
  /** The distinct documents the statements cite, told apart by their address: one name covers many */
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
 * « cette semaine » (`app/analyses/MovingDebates`): the two change together.
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

/** How far back the home page looks for the subjects being spoken on */
const SPOKEN_LATELY_DAYS = 30

/**
 * The day the home page counts the voices of late from, given when it
 * renders: a position counts when it was taken since — the day it was stated,
 * not the day the site recorded it.
 */
export const spokenSince = (now: Date): Date =>
  new Date(now.getTime() - SPOKEN_LATELY_DAYS * 24 * 60 * 60 * 1000)

/** One statement, reduced to who spoke on which subject */
export interface SubjectVoice {
  subjectId: string
  /** `authorKey` of who spoke */
  authorKey: string
}

/** subject id → how many distinct authors these statements give a voice to */
export function voicesBySubject(statements: readonly SubjectVoice[]): Map<string, number> {
  const authors = new Map<string, Set<string>>()
  for (const { subjectId, authorKey } of statements) {
    authors.set(subjectId, (authors.get(subjectId) ?? new Set()).add(authorKey))
  }
  return new Map(Array.from(authors, ([subjectId, voices]) => [subjectId, voices.size]))
}

/**
 * The subjects the most voices spoke on lately: the ones the home page opens
 * its subjects with. `lately` counts, for each subject, the voices of the
 * positions taken since `spokenSince`; a subject nobody spoke on since is not
 * shown. Two subjects as spoken on lately read from the one more voices spoke
 * on in all. The subject the page already details above is left out, so the
 * page never shows a subject twice.
 */
export const mostSpokenDebates = (
  debates: readonly Debate[],
  lately: ReadonlyMap<string, number>,
  limit: number,
  detailed: Debate | null,
): Debate[] => {
  const spoken = (debate: Debate) => lately.get(debate.id) ?? 0
  return debates
    .filter((debate) => spoken(debate) > 0 && debate.id !== detailed?.id)
    .sort(
      (a, b) =>
        spoken(b) - spoken(a) || b.voices - a.voices || a.title.localeCompare(b.title, 'fr'),
    )
    .slice(0, limit)
}

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
