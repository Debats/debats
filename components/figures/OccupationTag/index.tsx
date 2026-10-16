import Link from 'next/link'
import styles from './OccupationTag.module.css'

interface OccupationTagProps {
  name: string
  /** La page de la famille du métier */
  href: string
}

/** Pastille sobre qui relie une personnalité à un métier ou une fonction. */
export default function OccupationTag({ name, href }: OccupationTagProps) {
  return (
    <Link href={href} className={styles.tag}>
      {name}
    </Link>
  )
}
