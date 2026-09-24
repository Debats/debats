import ComingSoon from '../ComingSoon'
import styles from './SectionTabs.module.css'

export interface SectionTab {
  label: string
  count?: number
  /** L'onglet est annoncé mais pas encore disponible */
  soon?: boolean
}

interface SectionTabsProps {
  tabs: SectionTab[]
  /** Libellé de l'onglet actif (le seul disponible tant que les autres sont annoncés) */
  active: string
  ariaLabel: string
}

/**
 * Barre d'onglets d'une page de détail. Un seul onglet est actif et les
 * autres sont annoncés : la barre montre ce que la page deviendra.
 */
export default function SectionTabs({ tabs, active, ariaLabel }: SectionTabsProps) {
  return (
    <nav className={styles.tabs} aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const content = (
          <span className={tab.label === active ? `${styles.tab} ${styles.tabOn}` : styles.tab}>
            {tab.label}
            {tab.count !== undefined && <span className={styles.count}>{tab.count}</span>}
          </span>
        )
        if (tab.soon) return <ComingSoon key={tab.label}>{content}</ComingSoon>
        return (
          <span key={tab.label} aria-current={tab.label === active ? 'page' : undefined}>
            {content}
          </span>
        )
      })}
    </nav>
  )
}
