import Link from 'next/link'
import styles from './AuthorSubjectHero.module.css'

/** Ce qui nomme l'auteur sous son nom : ses métiers actuels, ses affiliations */
export interface AuthorRole {
  occupations: string[]
  organisations: Array<{ name: string; slug: string; acronym: string | null }>
}

/**
 * Les métiers et les affiliations de l'auteur, en pastilles sous son nom.
 * Le visiteur venu d'un moteur de recherche ne sait pas qui il lit.
 */
export default function AuthorRoleLine({ role }: { role: AuthorRole }) {
  if (role.occupations.length === 0 && role.organisations.length === 0) return null
  return (
    <p className={styles.role}>
      {role.occupations.map((occupation) => (
        <span key={occupation} className={styles.occupation}>
          {occupation}
        </span>
      ))}
      {role.organisations.map((organisation) => (
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
