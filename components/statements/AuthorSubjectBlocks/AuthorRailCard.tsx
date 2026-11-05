import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import { authorHref, StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { plural } from '../../../lib/plural'
import styles from './AuthorSubjectBlocks.module.css'

interface AuthorRailCardProps {
  author: StatementAuthorRef
  /** Les sujets sur lesquels l'auteur s'est exprimé, sur tout le site */
  subjects: number
  /** Ses prises de position sur tout le site */
  statements: number
  /**
   * Ce qui le présente, et que seule sa page sait dire : les métiers et les
   * affiliations d'une personnalité, le type et les membres d'une
   * organisation.
   */
  children?: React.ReactNode
}

/**
 * La carte de visite de l'auteur, pour le visiteur qui arrive d'un moteur
 * de recherche et ne sait pas qui il lit. Cette carte ne porte que ce que
 * les deux pages ont en commun — l'avatar, le nom, les compteurs, le lien ;
 * l'identité vient de la page, en enfants.
 */
export default function AuthorRailCard({
  author,
  subjects,
  statements,
  children,
}: AuthorRailCardProps) {
  return (
    <div className={styles.railCard}>
      <p className={styles.railCardTitle}>{author.name} en bref</p>
      <div className={styles.authorHead}>
        <AuthorAvatar author={author} size={52} />
        <Link href={authorHref(author)} className={styles.authorName}>
          {author.name}
        </Link>
      </div>

      {children}

      <p className={styles.authorRole}>
        Sur Débats.co : {subjects} {plural(subjects, 'sujet', 'sujets')}, {statements}{' '}
        {plural(statements, 'prise de position', 'prises de position')}.
      </p>

      <Link href={authorHref(author)} className={styles.railCardLink}>
        Sa page complète
      </Link>
    </div>
  )
}
