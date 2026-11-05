import Link from 'next/link'
import AlignmentTrack from './AlignmentTrack'
import { SubjectAlignment } from '../../../domain/services/group-alignment'
import { percent } from '../../../lib/percent'
import { plural } from '../../../lib/plural'
import styles from './AlignmentChart.module.css'

interface AlignmentChartProps {
  alignment: SubjectAlignment
  /** « cette personnalité », « cette organisation » */
  who: string
}

/**
 * Avec qui l'auteur est raccord : par groupe, la part qui défend la même
 * position, son intervalle de confiance, et le trait de l'ensemble.
 */
export default function AlignmentChart({ alignment, who }: AlignmentChartProps) {
  const { everyone, rows } = alignment
  const reference = everyone.share

  return (
    <div className={styles.chart}>
      {rows.map((row) => (
        <div key={row.key} className={styles.row}>
          <span className={styles.group}>
            <Link href={row.href} className={styles.groupName}>
              {row.label}
            </Link>
            <span className={styles.voices}>
              {row.alignment.withAuthor} sur {row.alignment.total}{' '}
              {plural(row.alignment.total, 'voix', 'voix')}
            </span>
          </span>
          <AlignmentTrack alignment={row.alignment} reference={reference} label={row.label} />
          <span className={styles.value}>
            {percent(row.alignment.share)}
            <span className={styles.bounds}>
              {percent(row.alignment.low)}–{percent(row.alignment.high)}
            </span>
          </span>
        </div>
      ))}

      <div className={`${styles.row} ${styles.rowReference}`}>
        <span className={styles.group}>
          <span className={styles.groupName}>Toutes les voix du sujet</span>
          <span className={styles.voices}>
            {everyone.withAuthor} sur {everyone.total} {plural(everyone.total, 'voix', 'voix')}
          </span>
        </span>
        <AlignmentTrack
          alignment={everyone}
          reference={reference}
          label="Toutes les voix du sujet"
          isReference
        />
        <span className={styles.value}>
          {percent(everyone.share)}
          <span className={styles.bounds}>référence</span>
        </span>
      </div>

      <div className={styles.row}>
        <span />
        <div className={styles.scale} aria-hidden="true">
          <span>0 %</span>
          <span>50 %</span>
          <span>100 %</span>
        </div>
        <span />
      </div>

      <p className={styles.caveat}>
        Chaque barre est l’intervalle dans lequel la part du groupe se tient vraiment, vu le nombre
        de personnes qu’il compte. Tant qu’elle traverse le trait de l’ensemble, l’écart avec {who}{' '}
        ne conclut rien : la pastille reste creuse. Ces parts portent sur les personnes recensées
        sur Débats.co, pas sur un échantillon représentatif.
      </p>
    </div>
  )
}
