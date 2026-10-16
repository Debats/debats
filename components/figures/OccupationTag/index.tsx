import Link from 'next/link'
import styles from './OccupationTag.module.css'

interface OccupationTagProps {
  name: string
  slug: string
}

/** Pastille sobre qui relie une personnalité à un métier ou une fonction. */
export default function OccupationTag({ name, slug }: OccupationTagProps) {
  return (
    <Link href={`/metiers/${slug}`} className={styles.tag}>
      {name}
    </Link>
  )
}
