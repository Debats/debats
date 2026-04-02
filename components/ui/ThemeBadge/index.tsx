import Link from 'next/link'
import styles from './ThemeBadge.module.css'

interface ThemeBadgeProps {
  name: string
  slug: string
}

export default function ThemeBadge({ name, slug }: ThemeBadgeProps) {
  return (
    <Link href={`/s?theme=${slug}`} className={styles.badge}>
      {name}
    </Link>
  )
}
