import styles from './AnchorBar.module.css'

export interface AnchorBarItem {
  /** L'identifiant de la section visée dans la page */
  anchor: string
  label: string
  count: number
}

interface AnchorBarProps {
  items: AnchorBarItem[]
  ariaLabel: string
}

/** Barre collée sous l'en-tête d'un index : une pilule par section de la page. */
export default function AnchorBar({ items, ariaLabel }: AnchorBarProps) {
  return (
    <nav className={styles.bar} aria-label={ariaLabel}>
      <div className={styles.scroller}>
        {items.map((item) => (
          <a key={item.anchor} href={`#${item.anchor}`} className={styles.pill}>
            {item.label}
            <span className={styles.count}>{item.count}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
