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
  const day = dayKey(instant)
  let hash = 0
  for (let i = 0; i < day.length; i++) {
    hash = (hash * 31 + day.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % count
}
