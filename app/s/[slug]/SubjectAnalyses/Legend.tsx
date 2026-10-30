import { FamilyPositionMatrix } from '../../../../domain/services/occupation-distribution'
import { percent, shadeClass } from './labels'
import styles from './SubjectAnalyses.module.css'

/** Les positions de la matrice, chacune avec sa nuance et sa part dans l'ensemble. */
export default function Legend({ matrix }: { matrix: FamilyPositionMatrix }) {
  return (
    <ul className={styles.legend} aria-label="Positions">
      {matrix.positions.map((position, index) => (
        <li key={position.id} className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.swatch} ${shadeClass(index)}`} />
          {position.title}
          <span className={styles.legendShare}>{percent(position.share)}</span>
        </li>
      ))}
    </ul>
  )
}
