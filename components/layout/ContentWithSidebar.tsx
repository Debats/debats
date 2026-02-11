import { Suspense } from 'react'
import LastStatements from './last-statements'
import styles from './content-with-sidebar.module.css'

interface ContentWithSidebarProps {
  children: React.ReactNode
  topMargin?: boolean
}

export default function ContentWithSidebar({ children, topMargin }: ContentWithSidebarProps) {
  const className = topMargin ? `${styles.container} ${styles.withTopMargin}` : styles.container

  return (
    <div className={className}>
      <div className={styles.mainContent}>{children}</div>
      <aside className={styles.sidebar}>
        <Suspense fallback={null}>
          <LastStatements />
        </Suspense>
      </aside>
    </div>
  )
}
