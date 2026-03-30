import Link from 'next/link'
import styles from './LinkedTitle.module.css'

interface LinkedTitleProps {
  href: string
  as?: 'h2' | 'h3' | 'span'
  className?: string
  children: React.ReactNode
}

export default function LinkedTitle({
  href,
  as: Tag = 'h3',
  className,
  children,
}: LinkedTitleProps) {
  return (
    <Tag className={className}>
      <Link href={href} className={styles.link}>
        {children}
      </Link>
    </Tag>
  )
}
