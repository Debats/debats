import Link from 'next/link'
import styles from './BarList.module.css'

export interface BarListItem {
  key: string
  /** Ce qui précède le nom : un visage, un logo */
  lead?: React.ReactNode
  label: string
  href?: string
  /** La longueur de la barre, entre 0 et 1 : le domaine ou le bloc la calcule */
  part: number
  /** Ce que la barre mesure, écrit : « 24 sujets sur 27 » */
  value: string
}

interface BarListProps {
  items: BarListItem[]
  /** Les barres des organisations portent leur violet */
  tone?: 'ink' | 'org'
}

/**
 * Des lignes mesurées, dans une carte d'analyse : un nom, ce qu'il pèse en
 * toutes lettres, et une barre pour le comparer aux autres lignes.
 */
export default function BarList({ items, tone = 'ink' }: BarListProps) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.key} className={styles.item}>
          {item.lead && <span className={styles.lead}>{item.lead}</span>}
          <div className={styles.body}>
            <p className={styles.head}>
              {item.href ? (
                <Link href={item.href} className={styles.label}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.label}>{item.label}</span>
              )}
              <span className={styles.value}>{item.value}</span>
            </p>
            <div className={styles.track} aria-hidden="true">
              <div
                className={tone === 'org' ? styles.fillOrg : styles.fill}
                style={{ width: `${Math.min(1, Math.max(0, item.part)) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
