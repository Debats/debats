import Link from 'next/link'
import ContentWithSidebar from '../../layout/ContentWithSidebar'
import EditLink from '../../ui/EditLink'
import AuthorAvatarStack from '../AuthorAvatarStack'
import { STATEMENT_TYPE_LABELS } from '../../../domain/entities/statement'
import { PositionGroup, SubjectCompany } from '../../../domain/services/author-on-subject'
import { formatShortDate } from '../../../lib/format-date'
import { plural } from '../../../lib/plural'
import styles from './AuthorOnSubject.module.css'

interface AuthorOnSubjectProps {
  subject: { title: string; slug: string; problem: string }
  /** The author's positions on the subject, with their statements */
  positions: PositionGroup[]
  company: SubjectCompany
  /** Lien de modification d'une prise de position, quand l'utilisateur y a droit */
  editHref?: (statementId: string) => string
}

/** Le corps de la page « un auteur sur un sujet » : ses positions, les autres, le sujet en rail. */
export default function AuthorOnSubject({
  subject,
  positions,
  company,
  editHref,
}: AuthorOnSubjectProps) {
  const statementsCount = positions.reduce((sum, group) => sum + group.statements.length, 0)

  return (
    <ContentWithSidebar
      topMargin
      aside={
        <div className={styles.subjectCard}>
          <p className={styles.subjectCardTitle}>Le sujet</p>
          <Link href={`/s/${subject.slug}`} className={styles.subjectCardName}>
            {subject.title}
          </Link>
          <p className={styles.subjectCardProblem}>{subject.problem}</p>
          <Link href={`/s/${subject.slug}`} className={styles.subjectCardLink}>
            Voir toutes les positions
          </Link>
        </div>
      }
    >
      <section>
        <header className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {statementsCount} {plural(statementsCount, 'prise de position', 'prises de position')}
          </h2>
        </header>

        {positions.length === 0 ? (
          <p className={styles.empty}>Aucune prise de position enregistrée pour l’instant.</p>
        ) : (
          <div className={styles.list}>
            {positions.map(({ position, statements }) => {
              const allies = company.alliesByPosition.get(position.id) ?? []
              return (
                <article key={position.id} className={styles.card}>
                  <p className={styles.kicker}>Sa position</p>
                  <h3 className={styles.positionTitle}>
                    <Link
                      href={`/s/${subject.slug}/position/${position.slug}`}
                      className={styles.positionLink}
                    >
                      {position.title}
                    </Link>
                  </h3>
                  {statements.map((statement) => (
                    <div key={statement.id} className={styles.statement}>
                      <blockquote className={styles.quote}>{statement.quote}</blockquote>
                      <div className={styles.source}>
                        <span className={styles.type}>
                          {STATEMENT_TYPE_LABELS[statement.statementType]}
                        </span>
                        {statement.sourceUrl ? (
                          <a
                            href={statement.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.sourceLink}
                          >
                            {statement.sourceName}
                          </a>
                        ) : (
                          <span className={styles.sourceLink}>{statement.sourceName}</span>
                        )}
                        <span className={styles.separator}>·</span>
                        <span className={styles.date}>{formatShortDate(statement.statedAt)}</span>
                        {editHref && <EditLink href={editHref(statement.id)} />}
                      </div>
                    </div>
                  ))}
                  {allies.length > 0 && (
                    <div className={styles.allies}>
                      <span className={styles.alliesLabel}>Même position</span>
                      <AuthorAvatarStack
                        authors={allies}
                        max={10}
                        size={36}
                        subjectSlug={subject.slug}
                        moreHref={`/s/${subject.slug}/position/${position.slug}`}
                      />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {company.opponents.length > 0 && (
        <section className={styles.others}>
          <header className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Positions différentes</h2>
          </header>
          <div className={styles.list}>
            {company.opponents.map((group) => (
              <div key={group.slug} className={styles.otherCard}>
                <Link
                  href={`/s/${subject.slug}/position/${group.slug}`}
                  className={styles.otherTitle}
                >
                  {group.title}
                </Link>
                <AuthorAvatarStack
                  authors={group.authors}
                  max={8}
                  size={36}
                  subjectSlug={subject.slug}
                  moreHref={`/s/${subject.slug}/position/${group.slug}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </ContentWithSidebar>
  )
}
