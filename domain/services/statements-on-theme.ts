import { StatementWithDetails } from '../repositories/statement-repository'

/** The statements whose subject carries the theme, given the subjects that do */
export const statementsOnTheme = (
  statements: StatementWithDetails[],
  subjectIdsOnTheme: readonly string[],
): StatementWithDetails[] => {
  const onTheme = new Set(subjectIdsOnTheme)
  return statements.filter(({ subject }) => onTheme.has(subject.id))
}
