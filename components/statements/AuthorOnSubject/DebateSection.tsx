import Link from 'next/link'
import AuthorAvatarStack from '../AuthorAvatarStack'
import { PositionStanding } from '../../../domain/services/author-on-subject'
import { plural } from '../../../lib/plural'
import styles from './AuthorOnSubject.module.css'

interface DebateSectionProps {
  subjectSlug: string
  debate: PositionStanding[]
}

/**
 * Le débat en entier : toutes les positions ouvertes, de la plus à la moins
 * soutenue. Une position que personne n'a défendue reste affichée — son
 * vide est une information, et une invitation à contribuer.
 */
export default function DebateSection({ subjectSlug, debate }: DebateSectionProps) {
  if (debate.length === 0) return null
  const most = debate[0]?.authors.length ?? 0

  return (
    <section className={styles.others}>
      <header className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Le débat en entier</h2>
      </header>
      <div className={styles.list}>
        {debate.map((standing) => {
          const href = `/s/${subjectSlug}/position/${standing.position.slug}`
          const count = standing.authors.length
          return (
            <article
              key={standing.position.id}
              className={standing.hers ? styles.debateCardHers : styles.debateCard}
            >
              <div className={styles.debateHead}>
                <h3 className={styles.otherTitle}>
                  <Link href={href} className={styles.positionLink}>
                    {standing.position.title}
                  </Link>
                </h3>
                {standing.hers && <span className={styles.kicker}>Sa position</span>}
              </div>

              <div className={styles.debateBar}>
                <div className={styles.debateTrack}>
                  <div
                    className={styles.debateFill}
                    style={{ width: most > 0 ? `${(count / most) * 100}%` : '0%' }}
                  />
                </div>
                <span className={styles.debateCount}>
                  {count} {plural(count, 'voix', 'voix')}
                </span>
              </div>

              {count > 0 ? (
                <AuthorAvatarStack
                  authors={standing.authors}
                  max={8}
                  size={36}
                  subjectSlug={subjectSlug}
                  moreHref={href}
                />
              ) : (
                <p className={styles.debateEmpty}>
                  Personne ne l’a encore défendue ici.{' '}
                  <Link href="/contribuer" className={styles.subjectCardLink}>
                    Vous connaissez une déclaration ?
                  </Link>
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
