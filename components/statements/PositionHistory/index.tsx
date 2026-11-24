import { CSSProperties } from 'react'
import { PositionHistory as History } from '../../../domain/read-models/position-history'
import { StatementWithDetails } from '../../../domain/repositories/statement-repository'
import HistoryRow from './HistoryRow'
import styles from './PositionHistory.module.css'

interface PositionHistoryProps {
  subjectSlug: string
  history: History<StatementWithDetails>
}

/**
 * Les prises de position de l'auteur sur le sujet, de la plus récente à la
 * plus ancienne, chaque position dans son couloir : on le voit sauter d'une
 * position à celle qui la contredit, ou en tenir deux côte à côte.
 */
export default function PositionHistory({ subjectSlug, history }: PositionHistoryProps) {
  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <h2 className={styles.title}>Au fil du temps</h2>
      </header>

      <ol className={styles.rows} style={{ '--lanes': history.lanes } as CSSProperties}>
        {history.rows.map((row) => (
          <HistoryRow
            key={row.entry.statement.id}
            subjectSlug={subjectSlug}
            lanes={history.lanes}
            row={row}
          />
        ))}
      </ol>
    </section>
  )
}
