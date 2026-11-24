import Link from 'next/link'
import { statementTypeOf } from '../../../domain/entities/statement'
import { positionHref } from '../../../domain/read-models/hrefs'
import { historyEventLabel, HistoryRow as Row } from '../../../domain/read-models/position-history'
import { provenanceOf } from '../../../domain/read-models/statement-provenance'
import { StatementWithDetails } from '../../../domain/repositories/statement-repository'
import { dayKey } from '../../../domain/value-objects/day'
import { formatShortDate } from '../../../lib/format-date'
import HistoryGraph from './HistoryGraph'
import styles from './PositionHistory.module.css'

interface HistoryRowProps {
  subjectSlug: string
  lanes: number
  row: Row<StatementWithDetails>
}

/** Une prise de position dans l'historique : son jour, sa place dans les couloirs, sa position, sa source. */
export default function HistoryRow({ subjectSlug, lanes, row }: HistoryRowProps) {
  const { statement, position } = row.entry
  const provenance = provenanceOf({
    statementType: statementTypeOf(statement.content),
    sourceName: statement.sourceName,
    sourceUrl: statement.sourceUrl,
    jointDeclaration: statement.jointDeclaration,
  })

  return (
    <li className={styles.row}>
      <time className={styles.date} dateTime={dayKey(statement.statedAt)}>
        {formatShortDate(statement.statedAt)}
      </time>
      <HistoryGraph lanes={lanes} row={row} />
      <div className={styles.body}>
        <p className={styles.heading}>
          <Link
            href={positionHref(subjectSlug, position.slug)}
            className={row.tone === 'left' ? styles.positionLeft : styles.position}
          >
            {position.title}
          </Link>
          {row.event && <span className={styles.event}>{historyEventLabel(row.event)}</span>}
        </p>
        <p className={styles.source}>{provenance.name}</p>
      </div>
    </li>
  )
}
