import ComingSoon from '../../../../components/ui/ComingSoon'
import styles from './SubjectTabs.module.css'

interface SubjectTabsProps {
  positionsCount: number
}

/**
 * Onglets de la page sujet. Seul « Positions » existe ; les autres annoncent
 * les fonctionnalités à venir (arguments, analyses, chronologie).
 */
export default function SubjectTabs({ positionsCount }: SubjectTabsProps) {
  return (
    <nav className={styles.tabs} aria-label="Sections du sujet">
      <span className={`${styles.tab} ${styles.tabOn}`} aria-current="page">
        Positions <span className={styles.count}>{positionsCount}</span>
      </span>
      <ComingSoon>
        <span className={styles.tab}>Arguments</span>
      </ComingSoon>
      <ComingSoon>
        <span className={styles.tab}>Analyses</span>
      </ComingSoon>
      <ComingSoon>
        <span className={styles.tab}>Chronologie</span>
      </ComingSoon>
    </nav>
  )
}
