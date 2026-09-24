import ComingSoon from '../../../../components/ui/ComingSoon'
import styles from './PositionsFilter.module.css'

interface PositionsFilterProps {
  statementsCount: number
  positionsCount: number
}

/**
 * Filtre des prises de position par type d'acteur. Seules les personnalités
 * existent aujourd'hui ; les organisations sont annoncées.
 */
export default function PositionsFilter({ statementsCount, positionsCount }: PositionsFilterProps) {
  return (
    <div className={styles.row}>
      <div className={styles.segmented} role="group" aria-label="Filtrer les prises de position">
        <span className={`${styles.segment} ${styles.segmentOn}`} aria-current="true">
          Tous <span className={styles.count}>{statementsCount}</span>
        </span>
        <ComingSoon>
          <span className={styles.segment}>Personnalités</span>
        </ComingSoon>
        <ComingSoon>
          <span className={styles.segment}>Organisations</span>
        </ComingSoon>
      </div>
      {positionsCount > 1 && <p className={styles.hint}>Triées par soutien décroissant</p>}
    </div>
  )
}
