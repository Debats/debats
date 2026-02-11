import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createServerSupabaseClient } from '../../../infra/supabase/ssr'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { StatementWithFigure } from '../../../domain/repositories/statement-repository'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import ErrorDisplay from '../../../components/layout/ErrorDisplay'
import styles from './subject-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createServerSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
    if (!subject) return { title: 'Sujet introuvable' }
    return {
      title: subject.title,
      description: subject.presentation,
      openGraph: {
        title: subject.title,
        description: subject.presentation,
        type: 'article',
        url: `/s/${slug}`,
      },
    }
  } catch {
    return { title: 'Sujet' }
  }
}

function groupByPosition(statements: StatementWithFigure[]) {
  return statements.reduce(
    (acc, { statement, position, publicFigure }) => {
      if (!acc[position.id]) {
        acc[position.id] = { position, figures: [] }
      }
      acc[position.id].figures.push({ statement, publicFigure })
      return acc
    },
    {} as Record<
      string,
      {
        position: StatementWithFigure['position']
        figures: {
          statement: StatementWithFigure['statement']
          publicFigure: StatementWithFigure['publicFigure']
        }[]
      }
    >,
  )
}

export default async function SubjectDetailPage({ params }: PageProps) {
  const { slug } = await params

  try {
    const supabase = await createServerSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const statementRepo = createStatementRepository(supabase)

    const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))

    if (!subject) notFound()

    const statements = await Effect.runPromise(statementRepo.findBySubjectWithFigures(subject.id))

    const positionsMap = groupByPosition(statements)
    const positions = Object.values(positionsMap)

    const uniqueFigures = new Set(statements.map((s) => s.publicFigure.id))

    return (
      <ContentWithSidebar topMargin>
        <header className={styles.header}>
          <h1 className={styles.title}>{subject.title}</h1>
          <p className={styles.presentation}>{subject.presentation}</p>
          <p className={styles.problem}>{subject.problem}</p>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>
            POSITIONS <span className={styles.count}>{positions.length}</span>{' '}
            <span className={styles.countDetail}>
              ({uniqueFigures.size} personnalité{uniqueFigures.size !== 1 ? 's' : ''})
            </span>
          </h2>

          {positions.length === 0 ? (
            <p className={styles.emptyMessage}>Aucune prise de position enregistrée.</p>
          ) : (
            <div className={styles.positionsList}>
              {positions.map(({ position, figures }) => (
                <div key={position.id} className={styles.positionItem}>
                  <h3 className={styles.positionTitle}>{position.title}</h3>
                  <p className={styles.positionDescription}>{position.description}</p>
                  <a href="#" className={styles.viewArguments}>
                    Voir les arguments
                  </a>
                  <div className={styles.figuresRow}>
                    {figures.map(({ statement, publicFigure }) => (
                      <Link
                        key={statement.id}
                        href={`/p/${publicFigure.slug}`}
                        title={publicFigure.name}
                        className={styles.figureLink}
                      >
                        <FigureAvatar slug={publicFigure.slug} name={publicFigure.name} size={40} />
                      </Link>
                    ))}
                  </div>
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
        message="Impossible de charger le sujet."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
