import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createServerSupabaseClient } from '../../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { StatementWithDetails } from '../../../domain/repositories/statement-repository'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import ErrorDisplay from '../../../components/layout/ErrorDisplay'
import styles from './personality-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createServerSupabaseClient()
    const publicFigureRepo = createPublicFigureRepository(supabase)
    const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))
    if (!figure) return { title: 'Personnalité introuvable' }
    const description = figure.presentation
      ? `${figure.name} - ${figure.presentation}`
      : `Positions et prises de position de ${figure.name} sur les sujets de société.`
    return {
      title: figure.name,
      description,
      openGraph: {
        title: figure.name,
        description,
        type: 'profile',
        url: `/p/${slug}`,
      },
    }
  } catch {
    return { title: 'Personnalité' }
  }
}

function groupBySubject(statements: StatementWithDetails[]) {
  return statements.reduce(
    (acc, { statement, position, subject }) => {
      if (!acc[subject.id]) {
        acc[subject.id] = { subject, positions: [] }
      }
      acc[subject.id].positions.push({ statement, position })
      return acc
    },
    {} as Record<
      string,
      {
        subject: StatementWithDetails['subject']
        positions: {
          statement: StatementWithDetails['statement']
          position: StatementWithDetails['position']
        }[]
      }
    >,
  )
}

export default async function PersonalityDetailPage({ params }: PageProps) {
  const { slug } = await params

  try {
    const supabase = await createServerSupabaseClient()
    const publicFigureRepo = createPublicFigureRepository(supabase)
    const statementRepo = createStatementRepository(supabase)

    const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))

    if (!figure) notFound()

    const statements = await Effect.runPromise(
      statementRepo.findByPublicFigureWithDetails(figure.id),
    )

    const subjectsMap = groupBySubject(statements)
    const subjects = Object.values(subjectsMap)

    return (
      <ContentWithSidebar topMargin>
        <header className={styles.header}>
          <FigureAvatar slug={figure.slug} name={figure.name} size={120} />
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{figure.name}</h1>
            <p className={styles.presentation}>{figure.presentation}</p>
            {figure.wikipediaUrl && (
              <a
                href={figure.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.wikiLink}
              >
                Voir sur Wikipedia
              </a>
            )}
          </div>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>
            PRISES DE POSITION <span className={styles.count}>{statements.length}</span>
          </h2>

          {subjects.length === 0 ? (
            <p className={styles.emptyMessage}>Aucune prise de position enregistrée.</p>
          ) : (
            <div className={styles.subjectsList}>
              {subjects.map(({ subject, positions }) => (
                <div key={subject.id} className={styles.subjectItem}>
                  <Link href={`/s/${subject.slug}`} className={styles.subjectContext}>
                    {subject.title}
                  </Link>
                  {positions.map(({ statement, position }) => (
                    <div key={statement.id} className={styles.positionBlock}>
                      <h3 className={styles.positionTitle}>
                        <span className={styles.positionLabel}>Sa position :</span> {position.title}
                      </h3>
                      <p className={styles.positionDescription}>{position.description}</p>
                      <a href="#" className={styles.viewArguments}>
                        Voir les arguments
                      </a>
                    </div>
                  ))}
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
        message="Impossible de charger la personnalité."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
