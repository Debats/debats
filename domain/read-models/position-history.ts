import { CourseEntry, HeldPosition, lastStated, Step } from '../services/position-course'
import { dayKey } from '../value-objects/day'

/**
 * The history of an author on a subject, drawn as lanes: one lane per
 * position, one row per statement, the most recent first.
 *
 * A position has no end of its own: its lane runs to this day, unless a
 * statement contradicts it — the lane then ends under that statement and
 * curves into it. A position taken beside the ones she holds branches off
 * one of them, whose lane runs on.
 */

/** One statement of the author on the subject, with whatever else the page shows of it */
export interface OnSubject {
  position: { id: string; title: string }
  statement: { statedAt: Date; createdAt: Date }
}

/** A statement as her course reads it, carrying what the page gave to hand it back in its row */
export type HistoryEntry<T extends OnSubject> = CourseEntry<T['position']> & { given: T }

/** Whether she still holds the position of a lane today, or has left it since */
export type LaneTone = 'held' | 'left'

export interface HistoryRow<T extends OnSubject> {
  entry: T
  /** The lane of its position */
  lane: number
  tone: LaneTone
  /** She had already stated this position: its lane comes from below */
  restated: boolean
  /** The other lanes that run through the row */
  crossing: { lane: number; tone: LaneTone }[]
  /** The lanes a curve leaves to reach this statement */
  curvesFrom: number[]
  /** The positions she keeps beside the one she takes here; none when she restates hers */
  heldWith: T['position'][]
}

export interface PositionHistory<T extends OnSubject> {
  /** How many lanes the rows are drawn on */
  lanes: number
  /** From the most recent statement to the oldest */
  rows: HistoryRow<T>[]
}

type Steps<T extends OnSubject> = ReadonlyArray<Step<HistoryEntry<T>>>

/** The time she holds a position without a break, in indexes of the steps of her course */
interface Stretch {
  position: string
  from: number
  /** The step that contradicted it, `null` while she holds it */
  until: number | null
}

const toneOf = (stretch: Stretch): LaneTone => (stretch.until === null ? 'held' : 'left')

const runsThrough = (stretch: Stretch, index: number) =>
  stretch.from < index && (stretch.until === null || stretch.until > index)

/** A stretch opens each time she takes a position, and ends at the first statement that leaves it */
const stretchesOf = <T extends OnSubject>(steps: Steps<T>): Stretch[] =>
  steps.flatMap(({ entry, taken }, from) => {
    if (!taken) return []
    const position = entry.position.id
    const until = steps.findIndex(
      (later, at) => at > from && !!later.taken?.left.some((left) => left.position.id === position),
    )
    return [{ position, from, until: until < 0 ? null : until }]
  })

/** The stretch a statement belongs to: the last one its position opened */
const stretchAt = (stretches: Stretch[], position: string, index: number): Stretch =>
  stretches.filter((s) => s.position === position && s.from <= index).at(-1)!

/** A lane belongs to one position for the whole history, in the order she first stated them */
const lanesOf = <T extends OnSubject>(steps: Steps<T>): Map<string, number> =>
  new Map(
    Array.from(new Set(steps.map(({ entry }) => entry.position.id))).map((id, lane) => [id, lane]),
  )

/**
 * Where the curves to a position taken come from: every position she leaves
 * for it, or else the one she stated last among those she keeps beside it.
 */
function curveSources<P>(taken: { left: HeldPosition<P>[]; kept: HeldPosition<P>[] }) {
  if (taken.left.length > 0) return taken.left
  return taken.kept.length > 0 ? [lastStated(taken.kept)] : []
}

const distinct = <V>(values: V[]) => new Set(values).size

/** There is a history to tell once she took two positions, and not all the same day */
const hasHistory = <T extends OnSubject>(steps: Steps<T>) =>
  distinct(steps.map(({ entry }) => entry.position.id)) > 1 &&
  distinct(steps.map(({ entry }) => dayKey(entry.statedAt))) > 1

/**
 * The history the steps of her course draw; `null` when there is none to
 * tell: one position restated, or positions all taken the same day.
 */
export function historyOf<T extends OnSubject>(steps: Steps<T>): PositionHistory<T> | null {
  if (!hasHistory(steps)) return null

  const lanes = lanesOf(steps)
  const stretches = stretchesOf(steps)
  const laneOf = (position: string) => lanes.get(position)!

  const rows = steps.map(({ entry, taken }, index): HistoryRow<T> => {
    const own = stretchAt(stretches, entry.position.id, index)
    return {
      entry: entry.given,
      lane: laneOf(own.position),
      tone: toneOf(own),
      restated: index > own.from,
      crossing: stretches
        .filter((s) => s !== own && runsThrough(s, index))
        .map((s) => ({ lane: laneOf(s.position), tone: toneOf(s) })),
      curvesFrom: taken ? curveSources(taken).map((held) => laneOf(held.position.id)) : [],
      heldWith: taken ? taken.kept.map((held) => held.position) : [],
    }
  })
  return { lanes: lanes.size, rows: rows.reverse() }
}

const quoted = (titles: string[]) => titles.map((title) => `« ${title} »`)

const listed = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`

/** What a row says of the positions she keeps beside the one taken: « avec « Appel au cessez-le-feu » » */
export const heldWithLabel = (positions: ReadonlyArray<{ title: string }>): string =>
  `avec ${listed(quoted(positions.map((position) => position.title)))}`
