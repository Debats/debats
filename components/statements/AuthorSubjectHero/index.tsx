import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import { authorHref, StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { plural } from '../../../lib/plural'
import styles from './AuthorSubjectHero.module.css'

interface AuthorSubjectHeroProps {
  author: StatementAuthorRef
  subject: { title: string; slug: string }
  /**
   * Ce qui nomme l'auteur sous son nom. Vient de la page : une personnalité
   * se nomme par ses métiers et ses affiliations, une organisation par son
   * type et ses membres.
   */
  role?: React.ReactNode
  counts: {
    statements: number
    positions: number
    /** Les autres voix du sujet qui défendent une de ses positions */
    allies: number
    /** Les positions ouvertes sur le sujet, défendues ou non */
    openPositions: number
  }
  /** Partage et autres actions */
  actions: React.ReactNode
}

/**
 * En-tête de la page « une personnalité ou une organisation sur un sujet ».
 *
 * Le visiteur arrive le plus souvent d'un moteur de recherche et ne connaît
 * ni l'auteur ni le sujet : le bandeau le nomme, et laisse la réponse au
 * paragraphe de synthèse qui suit. Les compteurs sont une ligne de repères,
 * pas le sujet du bandeau.
 */
export default function AuthorSubjectHero({
  author,
  subject,
  role,
  counts,
  actions,
}: AuthorSubjectHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.top}>
          <nav className={styles.kicker} aria-label="Fil d’Ariane">
            <Link href={authorHref(author)} className={styles.crumb}>
              {author.kind === 'organisation' ? 'Organisation' : 'Personnalité'}
            </Link>
            <span className={styles.crumbSeparator}>/</span>
            <Link href={`/s/${subject.slug}`} className={styles.crumb}>
              Sujet
            </Link>
          </nav>
          <div className={styles.actions}>{actions}</div>
        </div>

        <div className={styles.main}>
          <AuthorAvatar author={author} size={96} />
          <div className={styles.identity}>
            <h1 className={styles.title}>
              <Link href={authorHref(author)} className={styles.figureLink}>
                {author.name}
              </Link>
            </h1>
            {role}
            <p className={styles.subject}>
              sur{' '}
              <Link href={`/s/${subject.slug}`} className={styles.subjectLink}>
                {subject.title}
              </Link>
            </p>
          </div>
        </div>

        <p className={styles.facts}>
          <span>
            {counts.statements}{' '}
            {plural(counts.statements, 'prise de position', 'prises de position')}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {counts.positions}{' '}
            {plural(counts.positions, 'position défendue', 'positions défendues')}
          </span>
          <span aria-hidden="true">·</span>
          <span>{counts.allies} voix du même avis</span>
          <span aria-hidden="true">·</span>
          <span>
            {counts.openPositions}{' '}
            {plural(counts.openPositions, 'position ouverte', 'positions ouvertes')} sur le sujet
          </span>
        </p>
      </div>
    </section>
  )
}
