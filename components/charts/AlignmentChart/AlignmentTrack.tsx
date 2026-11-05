import { Alignment } from '../../../domain/services/group-alignment'
import { percent } from '../../../lib/percent'
import styles from './AlignmentChart.module.css'

interface AlignmentTrackProps {
  alignment: Alignment
  /** La part de l'ensemble, où tombe le trait de référence */
  reference: number
  label: string
  /** La ligne de l'ensemble : pastille pleine, sans intervalle */
  isReference?: boolean
}

/** L'axe de 0 à 100 % : le trait de l'ensemble, l'intervalle, la part observée. */
export default function AlignmentTrack({
  alignment,
  reference,
  label,
  isReference,
}: AlignmentTrackProps) {
  const { share, low, high, conclusive } = alignment
  const description = isReference
    ? `${label} : ${percent(share)}, la référence`
    : `${label} : ${percent(share)}, entre ${percent(low)} et ${percent(high)}, contre ${percent(reference)} pour l’ensemble`

  return (
    <div className={styles.track}>
      <div aria-hidden="true" className={styles.axis} />
      <div
        aria-hidden="true"
        className={styles.reference}
        style={{ left: `${reference * 100}%` }}
      />
      {!isReference && (
        <div
          aria-hidden="true"
          className={styles.interval}
          style={{ left: `${low * 100}%`, width: `${(high - low) * 100}%` }}
        />
      )}
      <div
        role="img"
        aria-label={description}
        className={dotClass(isReference, conclusive)}
        style={{ left: `${share * 100}%` }}
      />
    </div>
  )
}

/** Pastille creuse tant que l'intervalle contient l'ensemble : l'écart ne conclut pas */
function dotClass(isReference: boolean | undefined, conclusive: boolean): string {
  if (isReference) return `${styles.dot} ${styles.dotReference}`
  return conclusive ? styles.dot : `${styles.dot} ${styles.dotInconclusive}`
}
