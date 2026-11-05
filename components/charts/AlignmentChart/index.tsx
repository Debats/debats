import Link from 'next/link'
import AlignmentTrack from './AlignmentTrack'
import { SubjectAlignment } from '../../../domain/services/group-alignment'
import { percent } from '../../../lib/percent'
import styles from './AlignmentChart.module.css'

interface AlignmentChartProps {
  alignment: SubjectAlignment
  /** Le nom de la ligne de référence, et son libellé dans les descriptions */
  referenceLabel: string
  /**
   * Ce qu'il faut savoir pour lire le graphique. Le texte appartient à la
   * page : ce composant ne dit pas de quoi on parle, il montre des écarts.
   */
  caveat?: React.ReactNode
}

/**
 * Des parts comparées à une référence : par groupe, la part observée, son
 * intervalle de confiance, et le trait de la référence. Une pastille creuse
 * est une part dont l'intervalle contient la référence — l'écart ne conclut
 * rien.
 */
export default function AlignmentChart({ alignment, referenceLabel, caveat }: AlignmentChartProps) {
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
              {row.alignment.withAuthor} sur {row.alignment.total} voix
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
          <span className={styles.groupName}>{referenceLabel}</span>
          <span className={styles.voices}>
            {everyone.withAuthor} sur {everyone.total} voix
          </span>
        </span>
        <AlignmentTrack
          alignment={everyone}
          reference={reference}
          label={referenceLabel}
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

      {caveat && <p className={styles.caveat}>{caveat}</p>}
    </div>
  )
}
