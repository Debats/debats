import { ChangeSide } from '../../domain/read-models/position-changes'
import { formatMonthYear } from '../../lib/format-date'
import styles from './PositionChanges.module.css'

/** Un côté du changement : quand, et quelle position. */
export default function ChangeSideLabel({ side }: { side: ChangeSide }) {
  return (
    <span className={styles.side}>
      <span className={styles.date}>{formatMonthYear(side.statedAt)}</span>
      <span className={styles.position}>{side.title}</span>
    </span>
  )
}
