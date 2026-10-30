import { ReactNode } from 'react'
import {
  STATEMENT_TYPE_LABELS,
  StatementContent,
  statementTypeOf,
} from '../../../domain/entities/statement'
import { formatShortDate } from '../../../lib/format-date'
import styles from './StatementSource.module.css'

interface StatementSourceProps {
  statement: {
    /** Le type n'est pas une donnée à part : c'est la nature de ce qui est porté */
    content: StatementContent
    sourceName: string
    sourceUrl: string
    statedAt: Date
  }
  /** Compléments en fin de ligne : lien de modification, autres auteurs… */
  children?: ReactNode
}

/** La ligne de provenance d'une prise de position : type, source, date. */
export default function StatementSource({ statement, children }: StatementSourceProps) {
  return (
    <div className={styles.source}>
      <span className={styles.type}>
        {STATEMENT_TYPE_LABELS[statementTypeOf(statement.content)]}
      </span>
      <a
        href={statement.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sourceLink}
      >
        {statement.sourceName}
      </a>
      <span className={styles.separator}>·</span>
      <span className={styles.date}>{formatShortDate(statement.statedAt)}</span>
      {children}
    </div>
  )
}
