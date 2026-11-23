import { JointDeclarationRef } from '../entities/joint-declaration'
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
  /**
   * The joint declaration the entry is the signature of, when it stands for a
   * whole signature: across the site a signature is one entry, « signed the
   * text ». Absent on the rail of one subject, where the entry is the
   * statement the signatory holds there.
   */
  jointDeclaration?: JointDeclarationRef
}
