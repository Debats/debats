import {
  FamilyPositionMatrix,
  SMALL_FAMILY,
} from '../../../../domain/services/occupation-distribution'
import { percent, signed } from './labels'
import styles from './SubjectAnalyses.module.css'

/** The deviation axis spans this many points on each side */
const DEVIATION_AXIS = 50

/** Position par position, l'écart de chaque famille à l'ensemble, en points */
export default function Deviations({ matrix }: { matrix: FamilyPositionMatrix }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Quelles familles penchent plus que les autres</h3>
      <p className={styles.subtitle}>
        Pour chaque position, l’écart entre la part de la famille et la part de l’ensemble des
        personnalités. À droite du trait, la famille y est plus favorable que la moyenne ; à gauche,
        moins. Une famille de moins de {SMALL_FAMILY} personnalités est grisée.
      </p>
      <div className={styles.deviationGrid}>
        {matrix.positions.map((position, i) => (
          <div key={position.id} className={styles.deviationBlock}>
            <div className={styles.deviationHead}>
              <span className={styles.deviationPosition}>{position.title}</span>
              <span className={styles.deviationOverall}>ensemble {percent(position.share)}</span>
            </div>
            <div className={styles.deviationRows}>
              {matrix.families.map(({ family, cells, small }) => {
                const cell = cells[i]
                const points = Math.max(
                  -DEVIATION_AXIS,
                  Math.min(DEVIATION_AXIS, Math.round(cell.deviation * 100)),
                )
                const dot = 50 + (points / DEVIATION_AXIS) * 50
                return (
                  <div key={family.id} className={styles.deviationRow}>
                    <span className={styles.deviationFamily}>{family.name}</span>
                    <div className={styles.deviationTrack}>
                      <div aria-hidden="true" className={styles.deviationAxis} />
                      <div
                        aria-hidden="true"
                        className={styles.deviationStem}
                        style={{ left: `${Math.min(50, dot)}%`, width: `${Math.abs(dot - 50)}%` }}
                      />
                      <div
                        role="img"
                        aria-label={`${family.name} : ${percent(cell.share)} contre ${percent(position.share)} pour l’ensemble`}
                        className={small ? `${styles.dot} ${styles.dotSmall}` : styles.dot}
                        style={{ left: `${dot}%` }}
                      />
                    </div>
                    <span className={styles.deviationValue}>{signed(cell.deviation)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
