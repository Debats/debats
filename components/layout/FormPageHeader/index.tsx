import Link from 'next/link'
import styles from './FormPageHeader.module.css'

interface FormPageHeaderProps {
  backHref: string
  backLabel: string
  title: string
  subtitle: string
}

export default function FormPageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
}: FormPageHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href={backHref} className={styles.backLink}>
        &larr; {backLabel}
      </Link>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </header>
  )
}
