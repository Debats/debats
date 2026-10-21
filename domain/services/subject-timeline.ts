import { StatementType } from '../entities/statement'
import { ArgumentRef } from '../read-models/argument'
import { StatementAuthorRef } from '../read-models/statement-author'
import { StatedSpan, StatementWithAuthor } from '../repositories/statement-repository'
import { groupStatementsByYear } from './statements-by-year'

/** One statement as the timeline of a subject shows it */
export interface TimelineEntry {
  statementId: string
  statedAt: Date
  author: StatementAuthorRef
  position: { id: string; title: string; slug: string }
  statementType: StatementType
  quote: string
  sourceName: string
  sourceUrl?: string
  arguments: ArgumentRef[]
}

/** The statements of one year, newest first */
export interface TimelineYear {
  year: number
  entries: TimelineEntry[]
  /** Distinct authors who spoke that year */
  authorsCount: number
  /** Distinct positions taken that year */
  positionsCount: number
}

const toEntry = ({
  statement,
  position,
  author,
  arguments: used,
}: StatementWithAuthor): TimelineEntry => ({
  statementId: statement.id,
  statedAt: statement.statedAt,
  author,
  position: { id: position.id, title: position.title, slug: position.slug },
  statementType: statement.statementType,
  quote: statement.quote,
  sourceName: statement.sourceName,
  sourceUrl: statement.sourceUrl,
  arguments: used,
})

/** The statements of a subject in the order they were stated, newest first, one group per year */
export function subjectTimeline(statements: StatementWithAuthor[]): TimelineYear[] {
  return groupStatementsByYear(statements).map(({ year, entries }) => ({
    year,
    entries: entries.map(toEntry),
    authorsCount: new Set(entries.map((e) => `${e.author.kind}:${e.author.id}`)).size,
    positionsCount: new Set(entries.map((e) => e.position.id)).size,
  }))
}

/** What the Chronologie tab announces: the years the debate spans, or one year */
export function statedSpanLabel(span: StatedSpan | null): string | undefined {
  if (!span) return undefined
  const from = span.from.getUTCFullYear()
  const to = span.to.getUTCFullYear()
  return from === to ? String(to) : `${from} → ${to}`
}
