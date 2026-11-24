import { courseOf, HeldPosition, lastStated, Step } from '../services/position-course'
import { dayKey } from '../value-objects/day'
import { Compatibility } from './position-judgements'

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
interface OnSubject {
  position: { id: string; title: string }
  statement: { statedAt: Date; createdAt: Date }
}

/** Whether she still holds the position of a lane today, or has left it since */
export type LaneTone = 'held' | 'left'

/** What a statement did to the positions she held: it left some, or joined them */
export interface HistoryEvent<P> {
  kind: 'leaves' | 'joins'
  positions: P[]
}

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
  event: HistoryEvent<T['position']> | null
}

export interface PositionHistory<T extends OnSubject> {
  /** How many lanes the rows are drawn on */
  lanes: number
  /** From the most recent statement to the oldest */
  rows: HistoryRow<T>[]
}

/** The time she holds a position without a break, in indexes of the steps of her course */
interface Stretch {
  lane: number
  from: number
  /** The step that contradicted it, `null` while she holds it */
  until: number | null
}

type Entry<T extends OnSubject> = {
  position: T['position']
  statedAt: Date
  recordedAt: Date
  /** What the page gave, handed back in the row */
  given: T
}

const toneOf = (stretch: Stretch): LaneTone => (stretch.until === null ? 'held' : 'left')

const runsThrough = (stretch: Stretch, index: number) =>
  stretch.from < index && (stretch.until === null || stretch.until > index)

/** Each step with the stretch its statement belongs to, and every stretch of the course */
function stretchesOf<T extends OnSubject>(steps: ReadonlyArray<Step<Entry<T>>>) {
  const lanes = new Map<string, number>()
  const open = new Map<string, number>()
  let stretches: Stretch[] = []

  const placed = steps.map(({ entry, taken }, index) => {
    const { id } = entry.position
    if (!lanes.has(id)) lanes.set(id, lanes.size)
    if (taken) {
      const ended = new Set(taken.left.map((left) => open.get(left.position.id)))
      stretches = stretches.map((s, at) => (ended.has(at) ? { ...s, until: index } : s))
      open.set(id, stretches.length)
      stretches = [...stretches, { lane: lanes.get(id)!, from: index, until: null }]
    }
    return open.get(id)!
  })
  return { lanes, stretches, placed }
}

type Taken<P> = { left: HeldPosition<P>[]; kept: HeldPosition<P>[] }

/**
 * Where the curves to a position taken come from: every position she leaves
 * for it, or else the one she stated last among those she keeps beside it.
 */
function curveSources<P>({ left, kept }: Taken<P>): HeldPosition<P>[] {
  if (left.length > 0) return left
  return kept.length > 0 ? [lastStated(kept)] : []
}

function eventOf<P>(taken: Taken<P>): HistoryEvent<P> | null {
  if (taken.left.length > 0) return { kind: 'leaves', positions: taken.left.map((h) => h.position) }
  if (taken.kept.length > 0) return { kind: 'joins', positions: taken.kept.map((h) => h.position) }
  return null
}

const distinct = <V>(values: V[]) => new Set(values).size

/** There is a history to tell once she took two positions, and not all the same day */
const hasHistory = (statements: ReadonlyArray<OnSubject>) =>
  distinct(statements.map(({ position }) => position.id)) > 1 &&
  distinct(statements.map(({ statement }) => dayKey(statement.statedAt))) > 1

/** `null` when there is no history to tell: one position restated, or positions all taken the same day */
export function positionHistory<T extends OnSubject>(
  statements: ReadonlyArray<T>,
  compatible: Compatibility,
): PositionHistory<T> | null {
  if (!hasHistory(statements)) return null

  const { steps } = courseOf(
    statements.map(
      (given): Entry<T> => ({
        position: given.position,
        statedAt: given.statement.statedAt,
        recordedAt: given.statement.createdAt,
        given,
      }),
    ),
    compatible,
  )
  const { lanes, stretches, placed } = stretchesOf(steps)

  const rows = steps.map(({ entry, taken }, index): HistoryRow<T> => {
    const own = stretches[placed[index]]
    return {
      entry: entry.given,
      lane: own.lane,
      tone: toneOf(own),
      restated: index > own.from,
      crossing: stretches
        .filter((s) => s !== own && runsThrough(s, index))
        .map((s) => ({ lane: s.lane, tone: toneOf(s) })),
      curvesFrom: taken ? curveSources(taken).map((held) => lanes.get(held.position.id)!) : [],
      event: taken && eventOf(taken),
    }
  })
  return { lanes: lanes.size, rows: rows.reverse() }
}

const quoted = (titles: string[]) => titles.map((title) => `« ${title} »`)

const listed = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`

/** What the row says of its event: « quitte « Maintien à 62 ans » », « avec « Appel au cessez-le-feu » » */
export function historyEventLabel(event: HistoryEvent<{ title: string }>): string {
  const verb = event.kind === 'leaves' ? 'quitte' : 'avec'
  return `${verb} ${listed(quoted(event.positions.map((position) => position.title)))}`
}
