import Link from 'next/link'
import Button from '../Button'
import styles from './FormSuccess.module.css'

interface SecondaryAction {
  label: string
  href?: string
  onClick?: () => void
}

interface FormSuccessProps {
  title: string
  description?: string
  primaryAction: {
    label: string
    href: string
  }
  secondaryActions?: SecondaryAction[]
}

export default function FormSuccess({
  title,
  description,
  primaryAction,
  secondaryActions,
}: FormSuccessProps) {
  return (
    <div className={styles.container}>
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.actions}>
        <Button href={primaryAction.href}>{primaryAction.label}</Button>
        {secondaryActions?.map((action) =>
          action.href ? (
            <Link key={action.label} href={action.href} className={styles.secondaryLink}>
              {action.label}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              className={styles.secondaryButton}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
