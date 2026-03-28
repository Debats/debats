import styles from './SectionTitle.module.css'

interface SectionTitleProps {
  children: React.ReactNode
}

export default function SectionTitle({ children }: SectionTitleProps) {
  return <h2 className={styles.title}>{children}</h2>
}
