import styles from './CountBars.module.css'

export interface CountBar {
  key: string
  label: string
  count: number
}

interface CountBarsProps {
  /** Most first: the first entry sets the scale */
  entries: CountBar[]
}

/** Barres horizontales de comptage, un libellé à gauche, le nombre à droite. */
export default function CountBars({ entries }: CountBarsProps) {
  const max = entries[0]?.count ?? 0
  return (
    <ul className={styles.bars}>
      {entries.map((entry) => (
        <li key={entry.key} className={styles.bar}>
          <span className={styles.label}>{entry.label}</span>
          <div className={styles.track}>
            <div className={styles.fill} style={{ width: `${(entry.count / max) * 100}%` }} />
          </div>
          <span className={styles.value}>{entry.count}</span>
        </li>
      ))}
    </ul>
  )
}
