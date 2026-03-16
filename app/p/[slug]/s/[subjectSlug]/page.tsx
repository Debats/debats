import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../../../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import { StatementWithDetails } from '../../../../../domain/repositories/statement-repository'
import FigureAvatar from '../../../../../components/figures/FigureAvatar'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
import ErrorDisplay from '../../../../../components/layout/ErrorDisplay'
import styles from './figure-subject.module.css'

interface PageProps {
  params: Promise<{ slug: string; subjectSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subjectSlug } = await params
  try {
    const supabase = await createSSRSupabaseClient()
    const figureRepo = createPublicFigureRepository(supabase)
    const subjectRepo = createSubjectRepository(supabase)

    const [figure, subject] = await Promise.all([
      Effect.runPromise(figureRepo.findBySlug(slug)),
      Effect.runPromise(subjectRepo.findBySlug(subjectSlug)),
    ])

    if (!figure || !subject) return { title: 'Page introuvable' }

    const description = `Prises de position de ${figure.name} sur ${subject.title}.`
    return {
      title: `${figure.name} sur ${subject.title}`,
      description,
      openGraph: {
        title: `${figure.name} sur ${subject.title}`,
        description,
        type: 'profile',
        url: `/p/${slug}/s/${subjectSlug}`,
        images: [`/avatars/${slug}.jpg`],
      },
      twitter: {
        card: 'summary',
        title: `${figure.name} sur ${subject.title}`,
        description,
        images: [`/avatars/${slug}.jpg`],
      },
    }
  } catch {
    return { title: 'Prises de position' }
  }
}

function groupByPosition(statements: StatementWithDetails[]) {
  return statements.reduce(
    (acc, { statement, position, evidences }) => {
      if (!acc[position.id]) {
        acc[position.id] = { position, statements: [] }
      }
      acc[position.id].statements.push({ statement, evidences })
      return acc
    },
    {} as Record<
      string,
      {
        position: StatementWithDetails['position']
        statements: {
          statement: StatementWithDetails['statement']
          evidences: StatementWithDetails['evidences']
        }[]
      }
    >,
  )
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function FigureSubjectPage({ params }: PageProps) {
  const { slug, subjectSlug } = await params

  try {
    const supabase = await createSSRSupabaseClient()
    const figureRepo = createPublicFigureRepository(supabase)
    const subjectRepo = createSubjectRepository(supabase)
    const statementRepo = createStatementRepository(supabase)

    const [figure, subject] = await Promise.all([
      Effect.runPromise(figureRepo.findBySlug(slug)),
      Effect.runPromise(subjectRepo.findBySlug(subjectSlug)),
    ])

    if (!figure || !subject) notFound()

    const statements = await Effect.runPromise(
      statementRepo.findByPublicFigureAndSubject(figure.id, subject.id),
    )

    const positionsMap = groupByPosition(statements)
    const positions = Object.values(positionsMap)

    return (
      <ContentWithSidebar topMargin>
        <nav className={styles.breadcrumb}>
          <Link href={`/p/${figure.slug}`} className={styles.breadcrumbLink}>
            {figure.name}
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href={`/s/${subject.slug}`} className={styles.breadcrumbLink}>
            {subject.title}
          </Link>
        </nav>

        <header className={styles.header}>
          <FigureAvatar slug={figure.slug} name={figure.name} size={100} />
          <div>
            <Link href={`/p/${figure.slug}`} className={styles.figureName}>
              {figure.name}
            </Link>
            <p className={styles.subjectTitle}>
              sur{' '}
              <Link href={`/s/${subject.slug}`} className={styles.subjectLink}>
                {subject.title}
              </Link>
            </p>
          </div>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>
            <span className={styles.count}>{statements.length}</span>{' '}
            {statements.length === 1 ? 'PRISE DE POSITION' : 'PRISES DE POSITION'}
          </h2>

          {positions.length === 0 ? (
            <p className={styles.emptyMessage}>Aucune prise de position enregistrée.</p>
          ) : (
            <div>
              {positions.map(({ position, statements: posStatements }) => (
                <div key={position.id} className={styles.positionCard}>
                  <span className={styles.positionLabel}>Sa position</span>
                  <h3 className={styles.positionTitle}>{position.title}</h3>
                  {posStatements.flatMap(({ evidences }) =>
                    evidences.map((evidence) => (
                      <div key={evidence.id} className={styles.evidenceItem}>
                        <blockquote className={styles.quote}>{evidence.quote}</blockquote>
                        <div className={styles.evidenceMeta}>
                          {evidence.sourceUrl ? (
                            <a
                              href={evidence.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.sourceLink}
                            >
                              {evidence.sourceName}
                            </a>
                          ) : (
                            <span className={styles.sourceLink}>{evidence.sourceName}</span>
                          )}
                          <span className={styles.metaSeparator}>&mdash;</span>
                          {formatDate(evidence.factDate)}
                        </div>
                      </div>
                    )),
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </ContentWithSidebar>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger les prises de position."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
