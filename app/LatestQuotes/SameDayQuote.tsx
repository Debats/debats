import AuthorAvatar from '../../components/statements/AuthorAvatar'
import TookTogether from '../../components/statements/TookTogether'
import { StatementAuthorRef } from '../../domain/read-models/statement-author'
import { StatementWithAuthorAndSubject } from '../../domain/repositories/statement-repository'
import { formatShortDate } from '../../lib/format-date'
import styles from './LatestQuotes.module.css'

interface SameDayQuoteProps {
  author: StatementAuthorRef
  /** Ce qu'elle ou il a dit ou fait ce jour-là */
  entries: StatementWithAuthorAndSubject[]
}

/**
 * Ce qu'un·e auteur·rice a dit ou fait le même jour, dans le rail de
 * l'accueil, en une seule entrée : chaque position mène à ce qui a été dit.
 */
export default function SameDayQuote({ author, entries }: SameDayQuoteProps) {
  return (
    <li className={styles.entry}>
      <p className={styles.meta}>{formatShortDate(entries[0].statement.statedAt)}</p>
      <div className={styles.who}>
        <AuthorAvatar author={author} size={36} />
        <p className={styles.line}>
          <TookTogether
            author={author}
            entries={entries}
            nameClassName={styles.name}
            positionClassName={styles.subject}
          />
        </p>
      </div>
    </li>
  )
}
