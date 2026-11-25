import { plural } from '../../lib/plural'
import { Compatibility } from '../services/position-course'
import { orderedPair } from '../value-objects/pair'
import { subjectHref } from './hrefs'

export type { Compatibility }

/**
 * What was judged of two positions of a subject, as the pages read it. A
 * pair nobody judged is absent, and reads as contradictory: on most subjects
 * the positions exclude each other, so that is what the site assumes.
 */
export interface JudgedPair {
  positionIds: readonly [string, string]
  compatible: boolean
}

const pairKey = (a: string, b: string) => orderedPair(a, b).join('|')

/** The verdict on a pair: undefined while nobody judged it */
export const verdictIn = (pairs: readonly JudgedPair[]) => {
  const verdicts = new Map(
    pairs.map(({ positionIds: [a, b], compatible }) => [pairKey(a, b), compatible]),
  )
  return (a: string, b: string): boolean | undefined => verdicts.get(pairKey(a, b))
}

export const compatibilityOf = (pairs: readonly JudgedPair[]): Compatibility => {
  const verdict = verdictIn(pairs)
  return (a, b) => a === b || verdict(a, b) === true
}

/** No pair judged: every two positions exclude each other */
export const ALL_CONTRADICTORY: Compatibility = (a, b) => a === b

/**
 * The page where the positions of a subject are judged two by two:
 * `/s/<subject>/positions-compatibles`, then `?position=<slug>` for the
 * position it faces with the others.
 */
export const subjectCompatibilityHref = (subjectSlug: string, positionSlug?: string): string =>
  `${subjectHref(subjectSlug)}/positions-compatibles${
    positionSlug ? `?position=${encodeURIComponent(positionSlug)}` : ''
  }`

export interface BoardPosition {
  id: string
  title: string
  slug: string
}

/** One statement of the subject, reduced to who took which position */
export interface BoardVoice {
  author: { key: string; name: string }
  positionId: string
}

export interface BoardEntry {
  position: BoardPosition
  /** How many positions were judged compatible with it */
  compatible: number
  href: string
  selected: boolean
}

export interface BoardRow {
  position: BoardPosition
  compatible: boolean
  /** The authors who took both this position and the selected one, by name */
  heldBy: string[]
}

export interface CompatibilityBoard {
  /** Every open position of the subject, the most supported first */
  positions: BoardEntry[]
  /** The position faced with the others; null on a subject without positions */
  selected: BoardPosition | null
  /** The other positions, those somebody holds with the selected one first */
  rows: BoardRow[]
}

/** « Les deux chez Rima Hassan et 2 autres » ; null when nobody took both */
export const heldTogetherLabel = (names: readonly string[]): string | null => {
  if (names.length === 0) return null
  const others = names.length - 1
  return others === 0
    ? `Les deux chez ${names[0]}`
    : `Les deux chez ${names[0]} et ${others} ${plural(others, 'autre', 'autres')}`
}

/** « 2 compatibles », « aucune » */
export const compatibleCountLabel = (count: number): string =>
  count === 0 ? 'aucune' : `${count} ${plural(count, 'compatible', 'compatibles')}`

/** The distinct authors of each position */
function authorsByPosition(voices: readonly BoardVoice[]): Map<string, Map<string, string>> {
  const authors = new Map<string, Map<string, string>>()
  for (const { author, positionId } of voices) {
    const taken = authors.get(positionId) ?? new Map<string, string>()
    taken.set(author.key, author.name)
    authors.set(positionId, taken)
  }
  return authors
}

export function compatibilityBoard(
  subjectSlug: string,
  positions: readonly BoardPosition[],
  judged: readonly JudgedPair[],
  voices: readonly BoardVoice[],
  selectedSlug: string | undefined,
): CompatibilityBoard {
  const authors = authorsByPosition(voices)
  const supported = (position: BoardPosition) => authors.get(position.id)?.size ?? 0
  const compatible = compatibilityOf(judged)
  const ordered = [...positions].sort((a, b) => supported(b) - supported(a))
  const selected = ordered.find((p) => p.slug === selectedSlug) ?? ordered[0] ?? null
  const others = ordered.filter((p) => p.id !== selected?.id)
  const hers = (selected && authors.get(selected.id)) || new Map<string, string>()

  return {
    positions: ordered.map((position) => ({
      position,
      compatible: ordered.filter((p) => p.id !== position.id && compatible(p.id, position.id))
        .length,
      href: subjectCompatibilityHref(subjectSlug, position.slug),
      selected: position.id === selected?.id,
    })),
    selected,
    rows: others
      .map((position) => ({
        position,
        compatible: selected !== null && compatible(position.id, selected.id),
        heldBy: Array.from(authors.get(position.id) ?? [])
          .filter(([key]) => hers.has(key))
          .map(([, name]) => name),
      }))
      .sort((a, b) => Number(b.heldBy.length > 0) - Number(a.heldBy.length > 0)),
  }
}
