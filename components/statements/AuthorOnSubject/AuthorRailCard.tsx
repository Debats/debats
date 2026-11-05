import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import { AuthorProfile } from '../../../domain/read-models/author-subject-page'
import { authorHref, StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { plural } from '../../../lib/plural'
import styles from './AuthorOnSubject.module.css'

interface AuthorRailCardProps {
  author: StatementAuthorRef
  profile: AuthorProfile
}

/**
 * La carte de visite de l'auteur, pour le visiteur qui arrive d'un moteur
 * de recherche et ne sait pas qui il lit.
 */
export default function AuthorRailCard({ author, profile }: AuthorRailCardProps) {
  return (
    <div className={styles.subjectCard}>
      <p className={styles.subjectCardTitle}>{author.name} en bref</p>
      <div className={styles.authorHead}>
        <AuthorAvatar author={author} size={52} />
        <div>
          <Link href={authorHref(author)} className={styles.authorName}>
            {author.name}
          </Link>
          {profile.occupations.length > 0 && (
            <p className={styles.authorRole}>{profile.occupations.join(' · ')}</p>
          )}
        </div>
      </div>

      {profile.organisations.length > 0 && (
        <p className={styles.authorRole}>
          Affiliations :{' '}
          {profile.organisations.map((organisation, index) => (
            <span key={organisation.slug}>
              {index > 0 && ', '}
              <Link href={`/o/${organisation.slug}`} className={styles.authorOrganisation}>
                {organisation.acronym ?? organisation.name}
              </Link>
            </span>
          ))}
        </p>
      )}

      <p className={styles.authorRole}>
        Sur Débats.co : {profile.subjects} {plural(profile.subjects, 'sujet', 'sujets')},{' '}
        {profile.statements} {plural(profile.statements, 'prise de position', 'prises de position')}
        .
      </p>

      <Link href={authorHref(author)} className={styles.subjectCardLink}>
        Sa page complète
      </Link>
    </div>
  )
}
