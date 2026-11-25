import { StatementAuthorRef } from './statement-author'

/**
 * Lightweight projection for the rail of the last statements of one subject.
 * Across the site, the last statements are entries of the feed
 * (`feed-entries.ts`).
 */
export interface LatestStatement {
  statementId: string
  author: StatementAuthorRef
  positionTitle: string
  positionSlug: string
  subjectTitle: string
  subjectSlug: string
  statedAt: Date
  sourceName: string
}
