import { FLAG_OUTCOME_LABELS, QueuedFlag } from '../../../domain/read-models/flag-queue'
import { FLAG_REASON_LABELS } from '../../../domain/read-models/review'
import { formatShortDate } from '../../../lib/format-date'
import styles from './FlagNote.module.css'

interface FlagNoteProps {
  flag: QueuedFlag
}

/** Un signalement tel qu'il a été écrit : son motif, son commentaire, qui et quand ; puis ce qu'on en a fait. */
export default function FlagNote({ flag }: FlagNoteProps) {
  return (
    <div className={styles.note}>
      <p className={styles.reason}>{FLAG_REASON_LABELS[flag.reason]}</p>
      <p className={styles.comment}>« {flag.comment} »</p>
      <p className={styles.meta}>
        {flag.by ?? 'Un·e lecteur·rice'} · {formatShortDate(flag.at)}
      </p>
      {flag.outcome && (
        <div className={styles.settlement}>
          <p className={styles.outcome}>{FLAG_OUTCOME_LABELS[flag.outcome]}</p>
          {flag.answer && <p className={styles.comment}>« {flag.answer} »</p>}
          <p className={styles.meta}>
            {flag.settledBy ?? 'Un·e modérateur·rice'}
            {flag.settledAt && ` · ${formatShortDate(flag.settledAt)}`}
          </p>
        </div>
      )}
    </div>
  )
}
