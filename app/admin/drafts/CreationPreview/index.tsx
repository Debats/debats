import styles from './CreationPreview.module.css'

interface CreationPreviewProps {
  title: string
  children: React.ReactNode
}

export default function CreationPreview({ title, children }: CreationPreviewProps) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>Aperçu : {title}</summary>
      <div className={styles.content}>{children}</div>
    </details>
  )
}
