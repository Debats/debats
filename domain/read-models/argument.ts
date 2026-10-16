import { StatementAuthorRef } from './statement-author'

/** An argument as shown in a chip next to a statement */
export interface ArgumentRef {
  id: string
  title: string
}

/** A position that mobilises an argument, with how many statements do */
export interface ArgumentPositionCount {
  id: string
  title: string
  slug: string
  statementsCount: number
}

/** Read model of the subject's Arguments tab */
export interface SubjectArgumentSummary {
  id: string
  title: string
  description: string
  statementsCount: number
  /** Most mobilising position first */
  positions: ArgumentPositionCount[]
  totalAuthorsCount: number
  /** Up to the requested limit */
  authors: StatementAuthorRef[]
}

/** An argument mobilised by statements of more than one position */
export const isPolarisingArgument = (argument: SubjectArgumentSummary): boolean =>
  argument.positions.length > 1

/** The arguments mobilised under each position, most mobilised first (the summary's order) */
export function argumentsByPosition(
  summaries: SubjectArgumentSummary[],
): Map<string, ArgumentRef[]> {
  const byPosition = new Map<string, ArgumentRef[]>()
  for (const summary of summaries) {
    for (const position of summary.positions) {
      const list = byPosition.get(position.id) ?? []
      list.push({ id: summary.id, title: summary.title })
      byPosition.set(position.id, list)
    }
  }
  return byPosition
}
