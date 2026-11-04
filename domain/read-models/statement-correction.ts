import { Position } from '../entities/position'
import { Statement, StatementContent } from '../entities/statement'
import { Subject } from '../entities/subject'
import { StatementAuthorRef } from './statement-author'

/**
 * A statement as the admin API shows it to an automated contributor: what the
 * edit form holds, so the contributor reads before it corrects and sends back
 * only what changes.
 */
export interface StatementCorrectionView {
  id: string
  author: { kind: StatementAuthorRef['kind']; slug: string; name: string }
  subject: { slug: string; title: string }
  position: { slug: string; title: string }
  content: StatementContent
  sourceName: string
  sourceUrl: string
  /** ISO day (YYYY-MM-DD) */
  statedAt: string
  arguments: Array<{ id: string; title: string }>
}

export function statementCorrectionView(
  statement: Statement,
  author: StatementAuthorRef,
  subject: Subject,
  position: Position,
  mobilised: Array<{ id: string; title: string }>,
): StatementCorrectionView {
  return {
    id: statement.id,
    author: { kind: author.kind, slug: author.slug, name: author.name },
    subject: { slug: subject.slug, title: subject.title },
    position: { slug: position.slug, title: position.title },
    content: statement.content,
    sourceName: statement.sourceName,
    sourceUrl: statement.sourceUrl,
    statedAt: statement.statedAt.toISOString().slice(0, 10),
    arguments: mobilised.map(({ id, title }) => ({ id, title })),
  }
}
