import Link from 'next/link'
import AuthorAvatarStack from '../AuthorAvatarStack'
import { CONTRIBUTE_HREF, positionHref } from '../../../domain/read-models/hrefs'
import { PositionStanding } from '../../../domain/services/author-on-subject'
import styles from './SubjectDebate.module.css'

interface SubjectDebateProps {
  subjectSlug: string
  debate: PositionStanding[]
}

/**
 * Le débat en entier : toutes les positions ouvertes, de la plus à la moins
 * soutenue. Une position que personne n'a défendue reste affichée — son
 * vide est une information, et une invitation à contribuer.
 */
export default function SubjectDebate({ subjectSlug, debate }: SubjectDebateProps) {
  if (debate.length === 0) return null

  // La position la plus soutenue donne l'échelle. Lue sur la liste entière et
  // non sur sa première entrée : le tri est le travail de `debateOnSubject`,
  // ce bloc n'a pas à en dépendre pour ne pas dessiner de barre à 140 %.
  const most = Math.max(0, ...debate.map((standing) => standing.authors.length))

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <h2 className={styles.title}>Le débat en entier</h2>
      </header>
      <div className={styles.list}>
        {debate.map((standing) => {
          const href = positionHref(subjectSlug, standing.position.slug)
          const count = standing.authors.length
          return (
            <article
              key={standing.position.id}
              className={standing.hers ? styles.cardHers : styles.card}
            >
              <div className={styles.cardHead}>
                <h3 className={styles.positionTitle}>
                  <Link href={href} className={styles.positionLink}>
                    {standing.position.title}
                  </Link>
                </h3>
                {standing.hers && <span className={styles.kicker}>Sa position</span>}
              </div>

              <div className={styles.bar}>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: most > 0 ? `${(count / most) * 100}%` : '0%' }}
                  />
                </div>
                <span className={styles.count}>{count} voix</span>
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
                <p className={styles.empty}>
                  Personne ne l’a encore défendue ici.{' '}
                  <Link href={CONTRIBUTE_HREF} className={styles.emptyLink}>
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
