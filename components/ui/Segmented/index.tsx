import Link from 'next/link'
import ComingSoon from '../ComingSoon'
import styles from './Segmented.module.css'

export interface SegmentedItem {
  label: string
  count?: number
  /** L'option est un lien (filtre porté par l'URL) */
  href?: string
  /** L'option est annoncée mais pas encore disponible */
  soon?: boolean
}

interface SegmentedProps {
  items: SegmentedItem[]
  /** Libellé de l'option active */
  active: string
  ariaLabel: string
  /** Rend les options cliquables ; sans lui ni href, le contrôle est purement indicatif */
  onChange?: (label: string) => void
}

/** Contrôle segmenté : une option active, les autres cliquables, liées ou annoncées. */
export default function Segmented({ items, active, ariaLabel, onChange }: SegmentedProps) {
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
        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              scroll={false}
              className={styles.button}
              aria-current={isActive ? 'true' : undefined}
            >
              {content}
            </Link>
          )
        }
        if (onChange) {
          return (
            <button
              key={item.label}
              type="button"
              className={styles.button}
              aria-pressed={isActive}
              onClick={() => onChange(item.label)}
            >
              {content}
            </button>
          )
        }
        return (
          <span key={item.label} aria-current={isActive ? 'true' : undefined}>
            {content}
          </span>
        )
      })}
    </div>
  )
}
