import { StatementWithDetails } from '../repositories/statement-repository'

export interface SubjectGroup {
  subject: StatementWithDetails['subject']
  entries: Array<{
    statement: StatementWithDetails['statement']
    position: StatementWithDetails['position']
    arguments: StatementWithDetails['arguments']
  }>
}

/** Each argument tagged with the slug of its subject, to link to it from any page */
export function withSubjectSlug(statements: StatementWithDetails[]) {
  return statements.map(({ subject, arguments: used }) => ({
    arguments: used.map((argument) => ({ ...argument, subjectSlug: subject.slug })),
  }))
}

/** Groups an author's statements by subject, the most recently documented subject first. */
export function groupStatementsBySubject(statements: StatementWithDetails[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>()
  for (const { statement, position, subject, arguments: used } of statements) {
    const group = groups.get(subject.id) ?? { subject, entries: [] }
    group.entries.push({ statement, position, arguments: used })
    groups.set(subject.id, group)
  }
  const latest = (group: SubjectGroup) =>
    Math.max(...group.entries.map((e) => e.statement.createdAt.getTime()))
  return Array.from(groups.values()).sort((a, b) => latest(b) - latest(a))
}
