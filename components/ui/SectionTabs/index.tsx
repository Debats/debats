import Link from 'next/link'
import ComingSoon from '../ComingSoon'
import styles from './SectionTabs.module.css'

export interface SectionTab {
  label: string
  /** A number, or what stands for one: the years a chronology spans */
  count?: number | string
  /** L'onglet mène à une autre vue de la page */
  href?: string
  /** L'onglet est annoncé mais pas encore disponible */
  soon?: boolean
}

interface SectionTabsProps {
  tabs: SectionTab[]
  /** Libellé de l'onglet actif */
  active: string
  ariaLabel: string
}

/**
 * Barre d'onglets d'une page de détail : un onglet actif, les autres liés
 * ou annoncés. La barre montre ce que la page est et ce qu'elle deviendra.
 */
export default function SectionTabs({ tabs, active, ariaLabel }: SectionTabsProps) {
  return (
    <nav className={styles.tabs} aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.label === active
        const content = (
          <span className={isActive ? `${styles.tab} ${styles.tabOn}` : styles.tab}>
            {tab.label}
            {tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}
          </span>
        )
        if (tab.soon) return <ComingSoon key={tab.label}>{content}</ComingSoon>
        if (tab.href) {
          return (
            <Link
              key={tab.label}
              href={tab.href}
              scroll={false}
              className={styles.link}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </Link>
          )
        }
        return (
          <span key={tab.label} aria-current={isActive ? 'page' : undefined}>
            {content}
          </span>
        )
      })}
    </nav>
  )
}
