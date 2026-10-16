import { StatementWithAuthorAndSubject } from '../repositories/statement-repository'

export interface ArgumentPositionUsage {
  position: StatementWithAuthorAndSubject['position']
  entries: Array<Pick<StatementWithAuthorAndSubject, 'statement' | 'author'>>
}

export interface ArgumentSubjectUsage {
  subject: StatementWithAuthorAndSubject['subject']
  /** Most mobilising position first */
  positions: ArgumentPositionUsage[]
  statementsCount: number
}

/**
 * Where an argument is mobilised: by subject, then by position, the subject
 * with the most statements first. The page of an argument reads this.
 */
export function groupArgumentUsage(
  statements: StatementWithAuthorAndSubject[],
): ArgumentSubjectUsage[] {
  const subjects = new Map<
    string,
    ArgumentSubjectUsage & { byPosition: Map<string, ArgumentPositionUsage> }
  >()
  for (const { statement, position, subject, author } of statements) {
    const entry = subjects.get(subject.id) ?? {
      subject,
      positions: [],
      statementsCount: 0,
      byPosition: new Map(),
    }
    const usage = entry.byPosition.get(position.id) ?? { position, entries: [] }
    usage.entries.push({ statement, author })
    entry.byPosition.set(position.id, usage)
    entry.statementsCount += 1
    subjects.set(subject.id, entry)
  }

  return Array.from(subjects.values())
    .map(({ subject, statementsCount, byPosition }) => ({
      subject,
      statementsCount,
      positions: Array.from(byPosition.values()).sort(
        (a, b) => b.entries.length - a.entries.length,
      ),
    }))
    .sort((a, b) => b.statementsCount - a.statementsCount)
}

/** Distinct authors across every statement, whatever the subject */
export function countArgumentAuthors(statements: StatementWithAuthorAndSubject[]): number {
  return new Set(statements.map(({ author }) => `${author.kind}-${author.id}`)).size
}
