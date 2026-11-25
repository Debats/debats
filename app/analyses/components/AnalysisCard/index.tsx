import styles from './AnalysisCard.module.css'

interface AnalysisCardProps {
  /** Ce que la carte range, quand un bloc en pose plusieurs côte à côte */
  label?: string
  children: React.ReactNode
}

/** Une carte des analyses du site : un libellé discret, puis ce qu'elle mesure. */
export default function AnalysisCard({ label, children }: AnalysisCardProps) {
  return (
    <div className={styles.card}>
      {label && <h4 className={styles.label}>{label}</h4>}
      {children}
    </div>
  )
}
