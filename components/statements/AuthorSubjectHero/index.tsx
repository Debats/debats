import Link from 'next/link'
import AuthorAvatar from '../AuthorAvatar'
import { authorHref, StatementAuthorRef } from '../../../domain/read-models/statement-author'
import { plural } from '../../../lib/plural'
import styles from './AuthorSubjectHero.module.css'

interface AuthorSubjectHeroProps {
  author: StatementAuthorRef
  subject: { title: string; slug: string }
  counts: {
    statements: number
    positions: number
    allies: number
  }
  /** Partage et autres actions */
  actions: React.ReactNode
}

/** En-tête de la page « une personnalité ou une organisation sur un sujet ». */
export default function AuthorSubjectHero({
  author,
  subject,
  counts,
  actions,
}: AuthorSubjectHeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <nav className={styles.kicker} aria-label="Fil d’Ariane">
          <Link href={authorHref(author)} className={styles.crumb}>
            {author.kind === 'organisation' ? 'Organisation' : 'Personnalité'}
          </Link>
          <span className={styles.crumbSeparator}>/</span>
          <Link href={`/s/${subject.slug}`} className={styles.crumb}>
            Sujet
          </Link>
        </nav>

        <div className={styles.grid}>
          <div className={styles.main}>
            <AuthorAvatar author={author} size={96} />
            <div>
              <h1 className={styles.title}>
                <Link href={authorHref(author)} className={styles.figureLink}>
                  {author.name}
                </Link>
              </h1>
              <p className={styles.subject}>
                sur{' '}
                <Link href={`/s/${subject.slug}`} className={styles.subjectLink}>
                  {subject.title}
                </Link>
              </p>
            </div>
          </div>

          <div className={styles.aside}>
            <dl className={styles.stats}>
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.statements}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.statements, 'prise de position', 'prises de position')}
                </dt>
              </div>
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.positions}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.positions, 'position défendue', 'positions défendues')}
                </dt>
              </div>
              <div className={styles.stat}>
                <dd className={styles.statValue}>{counts.allies}</dd>
                <dt className={styles.statLabel}>
                  {plural(counts.allies, 'acteur du même avis', 'acteurs du même avis')}
                </dt>
              </div>
            </dl>
            <div className={styles.actions}>{actions}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
