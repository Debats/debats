import Link from 'next/link'
import { Affiliation } from '../../../domain/read-models/author-subject-page'
import styles from './AuthorSubjectHero.module.css'

/**
 * Ce qui nomme une personnalité sous son nom : ses métiers actuels et ses
 * affiliations, en pastilles. Le visiteur venu d'un moteur de recherche ne
 * sait pas qui il lit.
 */
export default function FigureRoleLine({
  occupations,
  organisations,
}: {
  occupations: string[]
  organisations: Affiliation[]
}) {
  if (occupations.length === 0 && organisations.length === 0) return null

  return (
    <p className={styles.role}>
      {occupations.map((occupation) => (
        <span key={occupation} className={styles.roleChip}>
          {occupation}
        </span>
      ))}
      {organisations.map((organisation) => (
        <Link
          key={organisation.slug}
          href={`/o/${organisation.slug}`}
          className={styles.organisation}
        >
          {organisation.acronym ?? organisation.name}
        </Link>
      ))}
    </p>
  )
}
