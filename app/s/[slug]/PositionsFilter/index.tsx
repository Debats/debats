import Segmented from '../../../../components/ui/Segmented'
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
      <Segmented
        ariaLabel="Filtrer les prises de position"
        active="Tous"
        items={[
          { label: 'Tous', count: statementsCount },
          { label: 'Personnalités', soon: true },
          { label: 'Organisations', soon: true },
        ]}
      />
      {positionsCount > 1 && <p className={styles.hint}>Triées par soutien décroissant</p>}
    </div>
  )
}
