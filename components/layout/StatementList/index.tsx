import FeedFaces from '../../statements/FeedFaces'
import FeedSentence from '../../statements/FeedSentence'
import { formatShortDate } from '../../../lib/format-date'
import styles from './StatementList.module.css'
import { FeedEntry, leadOf } from '../../../domain/read-models/feed-entries'

interface StatementListProps {
  title: string
  /** Des entrées du flux : une prise de position, les signatures d'un texte, ou ce qu'un·e auteur·rice a dit le même jour */
  entries: FeedEntry[]
  /** Le jour que la liste affiche : celui où la position a été prise, ou celui de son ajout au site */
  datedBy?: 'stated' | 'added'
}

/** Une liste d'entrées du flux dans un rail : qui, ce qui a été dit ou signé en une phrase, quand. */
export default function StatementList({ title, entries, datedBy = 'stated' }: StatementListProps) {
  if (entries.length === 0) return null

  return (
    <div>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.statementsList}>
        {entries.map((entry) => {
          const { statement } = leadOf(entry)
          return (
            <li key={statement.id} className={styles.statementItem}>
              <FeedFaces entry={entry} size={36} />
              <div className={styles.statementContent}>
                <p className={styles.publicFigureText}>
                  <FeedSentence
                    entry={entry}
                    nameClassName={styles.name}
                    positionClassName={styles.position}
                  />
                </p>
                <p className={styles.date}>
                  {formatShortDate(datedBy === 'added' ? statement.createdAt : statement.statedAt)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
