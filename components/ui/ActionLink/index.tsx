import Link from 'next/link'
import styles from './ActionLink.module.css'

interface ActionLinkProps {
  href: string
  children: React.ReactNode
}

export default function ActionLink({ href, children }: ActionLinkProps) {
  return (
    <Link href={href} className={styles.actionLink}>
      {children}
    </Link>
  )
}
