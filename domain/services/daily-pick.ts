import { dayKey } from '../value-objects/day'

/**
 * Picks a deterministic "random" index for a given day.
 * Same day = same result for all users, no storage needed. The day is the day
 * of the site, which turns over in Paris like every other day here, and the
 * instant comes from the page that renders: nothing in the domain reads a
 * clock of its own.
 */
export function dailyIndex(count: number, instant: Date): number {
  if (count === 0) return 0
  return hashOf(dayKey(instant)) % count
}

/**
 * Picks one item for a given day by what names it, not by its place in the
 * list: each item draws a number from the day and its own key, and the lowest
 * wins. An index into the list would move the pick whenever the list grows or
 * shrinks during the day; here a newcomer only changes the pick when it wins
 * the draw itself.
 */
export function dailyPick<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  instant: Date,
): T | null {
  const day = dayKey(instant)
  const drawn = items.map((item) => ({ item, key: keyOf(item) }))
  const draw = ({ key }: { key: string }) => scramble(hashOf(`${day}:${key}`))
  const [first] = drawn.sort((a, b) => draw(a) - draw(b) || a.key.localeCompare(b.key))
  return first?.item ?? null
}

/**
 * Spreads a hash over the whole range (the finalizer of MurmurHash3). The
 * polynomial hash alone ranks `day:a` and `day:b` the same way whatever the
 * day, since both share their beginning: the same item would win every day.
 */
function scramble(hash: number): number {
  let h = hash | 0
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

/** A non-negative number drawn from a text, the same every time */
function hashOf(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
