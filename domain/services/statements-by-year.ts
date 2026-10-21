/** Anything that carries a statement: what the year groups are made of */
export interface Dated {
  statement: { statedAt: Date; createdAt: Date }
}

export interface YearGroup<T extends Dated> {
  year: number
  /** Newest first */
  entries: T[]
}

/**
 * Statements in the order they were stated, newest first, one group per
 * year. Two statements of the same day stand in the order they were
 * recorded, the latest first.
 */
export function groupStatementsByYear<T extends Dated>(items: T[]): YearGroup<T>[] {
  const sorted = [...items].sort(
    (a, b) =>
      b.statement.statedAt.getTime() - a.statement.statedAt.getTime() ||
      b.statement.createdAt.getTime() - a.statement.createdAt.getTime(),
  )
  const years = new Map<number, T[]>()
  for (const item of sorted) {
    const year = item.statement.statedAt.getUTCFullYear()
    years.set(year, [...(years.get(year) ?? []), item])
  }
  return Array.from(years, ([year, entries]) => ({ year, entries }))
}
