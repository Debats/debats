import ComingSoon from '../ComingSoon'
import styles from './Segmented.module.css'

export interface SegmentedItem {
  label: string
  count?: number
  /** L'option est annoncée mais pas encore disponible */
  soon?: boolean
}

interface SegmentedProps {
  items: SegmentedItem[]
  /** Libellé de l'option active */
  active: string
  ariaLabel: string
}

/** Contrôle segmenté : une option active, les autres annoncées. */
export default function Segmented({ items, active, ariaLabel }: SegmentedProps) {
  return (
    <div className={styles.segmented} role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.label === active
        const content = (
          <span className={isActive ? `${styles.segment} ${styles.segmentOn}` : styles.segment}>
            {item.label}
            {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
          </span>
        )
        if (item.soon) return <ComingSoon key={item.label}>{content}</ComingSoon>
        return (
          <span key={item.label} aria-current={isActive ? 'true' : undefined}>
            {content}
          </span>
        )
      })}
    </div>
  )
}
