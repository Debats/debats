import {
  FamilyPositionMatrix,
  MatrixCell,
} from '../../../../domain/services/occupation-distribution'
import { percent, shadeClass } from './labels'
import styles from './SubjectAnalyses.module.css'

interface StackedBarProps {
  label: React.ReactNode
  cells: MatrixCell[]
  total: number
  matrix: FamilyPositionMatrix
  /** La ligne de référence : l'ensemble des personnalités */
  reference?: boolean
}

/** Une barre à 100 % : la part de chaque position dans une famille. */
export default function StackedBar({ label, cells, total, matrix, reference }: StackedBarProps) {
  const description = cells
    .map((cell, i) => `${matrix.positions[i].title} : ${cell.count}`)
    .join(', ')
  return (
    <div className={reference ? `${styles.barRow} ${styles.barRowReference}` : styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.stack} role="img" aria-label={description}>
        {cells.map((cell, i) => (
          <div
            key={matrix.positions[i].id}
            className={`${styles.segment} ${shadeClass(i)}`}
            style={{ width: `${cell.share * 100}%` }}
          >
            {cell.share >= 0.12 && percent(cell.share)}
          </div>
        ))}
      </div>
      <span className={styles.barValue}>{total}</span>
    </div>
  )
}
