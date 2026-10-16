import { SubjectIndexTotals } from '../../../domain/read-models/subject-index'
import { plural } from '../../../lib/plural'
import styles from './IndexStats.module.css'

interface IndexStatsProps {
  totals: SubjectIndexTotals
}

/** Les repères du bandeau de l'index : combien le site couvre. */
export default function IndexStats({ totals }: IndexStatsProps) {
  const stats = [
    { value: totals.subjects, label: plural(totals.subjects, 'sujet', 'sujets') },
    { value: totals.themes, label: plural(totals.themes, 'thématique', 'thématiques') },
    {
      value: totals.statements,
      label: plural(totals.statements, 'prise de position', 'prises de position'),
    },
  ]

  return (
    <dl className={styles.stats}>
      {stats.map((stat) => (
        <div key={stat.label} className={styles.stat}>
          <dd className={styles.value}>{stat.value}</dd>
          <dt className={styles.label}>{stat.label}</dt>
        </div>
      ))}
    </dl>
  )
}
