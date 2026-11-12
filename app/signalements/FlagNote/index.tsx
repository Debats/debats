import FlagQuote from '../../../components/review/FlagQuote'
import { FLAG_OUTCOME_LABELS, QueuedFlag } from '../../../domain/read-models/flag-queue'
import { formatShortDate } from '../../../lib/format-date'
import styles from './FlagNote.module.css'

interface FlagNoteProps {
  flag: QueuedFlag
}

/** Un signalement dans la file : ce qu'il dit, puis ce qu'on en a fait quand il est traité. */
export default function FlagNote({ flag }: FlagNoteProps) {
  return (
    <div className={styles.note}>
      <FlagQuote flag={flag} />
      {flag.outcome && (
        <div className={styles.settlement}>
          <p className={styles.outcome}>{FLAG_OUTCOME_LABELS[flag.outcome]}</p>
          {flag.answer && <p className={styles.answer}>« {flag.answer} »</p>}
          <p className={styles.meta}>
            {flag.settledBy ?? 'Un·e modérateur·rice'}
            {flag.settledAt && ` · ${formatShortDate(flag.settledAt)}`}
          </p>
        </div>
      )}
    </div>
  )
}
