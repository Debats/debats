import Link from 'next/link'
import styles from './OccupationTag.module.css'

interface OccupationTagProps {
  name: string
  /** La page de la famille du métier */
  href: string
  /** Un métier passé s'affiche grisé et préfixé « ex- » */
  current?: boolean
}

/** Pastille sobre qui relie une personnalité à un métier ou une fonction. */
export default function OccupationTag({ name, href, current = true }: OccupationTagProps) {
  return (
    <Link
      href={href}
      className={current ? styles.tag : `${styles.tag} ${styles.former}`}
      title={current ? undefined : 'Fonction passée'}
    >
      {current ? name : `ex-${name}`}
    </Link>
  )
}
