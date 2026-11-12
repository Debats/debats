import { FLAG_REASON_LABELS, OpenFlagDetail } from '../../../domain/read-models/review'
import { formatShortDate } from '../../../lib/format-date'
import styles from './FlagQuote.module.css'

interface FlagQuoteProps {
  flag: OpenFlagDetail
  /** Ce qui précède le motif quand le contexte ne dit pas déjà qu'il s'agit d'un signalement ouvert */
  kicker?: string
}

/** Un signalement tel qu'il a été écrit : son motif, son commentaire, qui et quand. */
export default function FlagQuote({ flag, kicker }: FlagQuoteProps) {
  return (
    <div>
      <p className={styles.reason}>
        {kicker && `${kicker} · `}
        {FLAG_REASON_LABELS[flag.reason]}
      </p>
      <p className={styles.comment}>« {flag.comment} »</p>
      <p className={styles.meta}>
        {flag.by ?? 'Un·e lecteur·rice'} · {formatShortDate(flag.at)}
      </p>
    </div>
  )
}
