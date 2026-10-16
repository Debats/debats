import Link from 'next/link'
import { argumentHref, ArgumentRef } from '../../../domain/read-models/argument'
import styles from './ArgumentChips.module.css'

interface ArgumentChipsProps {
  arguments: ArgumentRef[]
}

/** Les arguments qu'une prise de position mobilise, en pastilles vers leur page. Rien si aucun. */
export default function ArgumentChips({ arguments: used }: ArgumentChipsProps) {
  if (used.length === 0) return null

  return (
    <ul className={styles.list} aria-label="Arguments mobilisés">
      {used.map((argument) => (
        <li key={argument.id}>
          <Link href={argumentHref(argument)} className={styles.chip}>
            {argument.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}
