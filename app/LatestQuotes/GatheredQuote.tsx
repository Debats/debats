import FeedFaces from '../../components/statements/FeedFaces'
import FeedSentence from '../../components/statements/FeedSentence'
import { FeedEntry, leadOf } from '../../domain/read-models/feed-entries'
import { formatShortDate } from '../../lib/format-date'
import styles from './LatestQuotes.module.css'

/**
 * Une entrée qui réunit plusieurs prises de position, dans le rail de
 * l'accueil : les signatures d'un texte, ou ce qu'un·e auteur·rice a dit le
 * même jour, en une phrase. Le détail se lit sur la page du texte, ou sur
 * celles où mènent les positions.
 */
export default function GatheredQuote({ entry }: { entry: FeedEntry }) {
  const { statement } = leadOf(entry)

  return (
    <li className={styles.entry}>
      <p className={styles.meta}>
        {formatShortDate(statement.statedAt)}
        {/* The source of a text is that of each of its signatures; a day gathers several sources */}
        {entry.kind === 'signatures' && ` · ${statement.sourceName}`}
      </p>
      <div className={styles.who}>
        <FeedFaces entry={entry} size={36} />
        <p className={styles.line}>
          <FeedSentence
            entry={entry}
            nameClassName={styles.name}
            positionClassName={styles.subject}
          />
        </p>
      </div>
    </li>
  )
}
