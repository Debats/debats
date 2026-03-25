import Link from 'next/link'
import styles from './EditLink.module.css'

interface EditLinkProps {
  href: string
  label?: string
}

export default function EditLink({ href, label = 'Modifier' }: EditLinkProps) {
  return (
    <Link href={href} className={styles.editLink}>
      <span className={styles.icon}>✎</span>
      {label}
    </Link>
  )
}
