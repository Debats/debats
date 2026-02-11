import styles from './error-display.module.css'

interface ErrorDisplayProps {
  title: string
  message: string
  detail?: string
}

export default function ErrorDisplay({ title, message, detail }: ErrorDisplayProps) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      {detail && <p className={styles.detail}>{detail}</p>}
    </div>
  )
}
