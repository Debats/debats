import { StatementAuthorRef } from './statement-author'

/** Lightweight projection for the "latest statements" rails */
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
