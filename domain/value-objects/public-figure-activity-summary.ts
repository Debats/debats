/**
 * Read model for the /p page: public figure with pre-aggregated activity stats.
 */
export interface PublicFigureActivitySummary {
  id: string
  name: string
  slug: string
  presentation: string
  statementsCount: number
  subjectsCount: number
  latestStatementAt: Date | null
}
