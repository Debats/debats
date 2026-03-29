import styles from './HeaderActions.module.css'

interface HeaderActionsProps {
  children: React.ReactNode
}

export default function HeaderActions({ children }: HeaderActionsProps) {
  return <div className={styles.headerActions}>{children}</div>
}
