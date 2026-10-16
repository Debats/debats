import Link from 'next/link'
import { ArgumentRef } from '../../../domain/read-models/argument'
import styles from './ArgumentChips.module.css'

interface ArgumentChipsProps {
  arguments: ArgumentRef[]
  /** Le sujet dont l'onglet Arguments détaille chaque argument */
  subjectSlug: string
}

/** Lien vers un argument dans l'onglet Arguments de son sujet */
export const argumentHref = (subjectSlug: string, argumentId: string) =>
  `/s/${subjectSlug}?onglet=arguments#argument-${argumentId}`

/** Les arguments qu'une prise de position mobilise, en pastilles. Rien si aucun. */
export default function ArgumentChips({ arguments: used, subjectSlug }: ArgumentChipsProps) {
  if (used.length === 0) return null

  return (
    <ul className={styles.list} aria-label="Arguments mobilisés">
      {used.map((argument) => (
        <li key={argument.id}>
          <Link href={argumentHref(subjectSlug, argument.id)} className={styles.chip}>
            {argument.title}
          </Link>
        </li>
      ))}
    </ul>
  )
}
