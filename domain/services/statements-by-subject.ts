import { StatementWithDetails } from '../repositories/statement-repository'

export interface SubjectGroup {
  subject: StatementWithDetails['subject']
  entries: Array<{
    statement: StatementWithDetails['statement']
    position: StatementWithDetails['position']
  }>
}

/** Groups an author's statements by subject, the most recently documented subject first. */
export function groupStatementsBySubject(statements: StatementWithDetails[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>()
  for (const { statement, position, subject } of statements) {
    const group = groups.get(subject.id) ?? { subject, entries: [] }
    group.entries.push({ statement, position })
    groups.set(subject.id, group)
  }
  const latest = (group: SubjectGroup) =>
    Math.max(...group.entries.map((e) => e.statement.createdAt.getTime()))
  return Array.from(groups.values()).sort((a, b) => latest(b) - latest(a))
}
