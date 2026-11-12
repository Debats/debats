import { Suspense } from 'react'
import LastStatements from './last-statements'
import styles from './content-with-sidebar.module.css'

interface ContentWithSidebarProps {
  children: React.ReactNode
  topMargin?: boolean
  /** Contenu propre à la page, affiché en haut du rail */
  aside?: React.ReactNode
  /** Ne pas afficher les dernières prises de position du site (la page fournit les siennes) */
  hideLatestStatements?: boolean
  /** Le rail accompagne la lecture d'une longue colonne ; plus haut que l'écran, il défile dans sa hauteur */
  stickyAside?: boolean
}

export default function ContentWithSidebar({
  children,
  topMargin,
  aside,
  hideLatestStatements,
  stickyAside,
}: ContentWithSidebarProps) {
  const className = topMargin ? `${styles.container} ${styles.withTopMargin}` : styles.container

  return (
    <div className={className}>
      <div className={styles.mainContent}>{children}</div>
      <aside className={stickyAside ? `${styles.sidebar} ${styles.sticky}` : styles.sidebar}>
        {aside}
        {!hideLatestStatements && (
          <Suspense fallback={null}>
            <LastStatements />
          </Suspense>
        )}
      </aside>
    </div>
  )
}
