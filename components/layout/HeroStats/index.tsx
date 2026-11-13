import styles from './HeroStats.module.css'

export interface HeroStat {
  value: number
  /** Déjà accordé au nombre */
  label: string
}

interface HeroStatsProps {
  stats: HeroStat[]
}

/** Les repères du bandeau d'un index : combien le site couvre. */
export default function HeroStats({ stats }: HeroStatsProps) {
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
