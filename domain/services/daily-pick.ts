/**
 * Picks a deterministic "random" index for a given day.
 * Same date = same result for all users, no storage needed.
 */
export function dailyIndex(count: number, date: Date = new Date()): number {
  if (count === 0) return 0
  const dateString = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  let hash = 0
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash * 31 + dateString.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % count
}
