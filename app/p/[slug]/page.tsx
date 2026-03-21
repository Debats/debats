import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createSSRSupabaseClient } from '../../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { StatementWithDetails } from '../../../domain/repositories/statement-repository'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import Button from '../../../components/ui/Button'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import ErrorDisplay from '../../../components/layout/ErrorDisplay'
import styles from './personality-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createSSRSupabaseClient()
    const publicFigureRepo = createPublicFigureRepository(supabase)
    const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))
    if (!figure) return { title: 'Personnalité introuvable' }
    const description = figure.presentation
      ? `${figure.name} - ${figure.presentation}`
      : `Positions et prises de position de ${figure.name} sur les sujets de société.`
    const url = `/p/${slug}`
    return {
      title: figure.name,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: figure.name,
        description,
        type: 'profile',
        url,
      },
      twitter: {
        card: 'summary_large_image',
        title: figure.name,
        description,
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
        acc[subject.id] = { subject, entries: [] }
      }
      acc[subject.id].entries.push({ statement, position })
      return acc
    },
    {} as Record<
      string,
      {
        subject: StatementWithDetails['subject']
        entries: {
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
    const supabase = await createSSRSupabaseClient()
    const publicFigureRepo = createPublicFigureRepository(supabase)
    const statementRepo = createStatementRepository(supabase)

    const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))

    if (!figure) notFound()

    const [statements, contributor] = await Promise.all([
      Effect.runPromise(statementRepo.findByPublicFigureWithDetails(figure.id)),
      getAuthenticatedContributor(),
    ])

    const subjectsMap = groupBySubject(statements)
    const subjects = Object.values(subjectsMap).sort((a, b) => {
      const latestA = Math.max(...a.entries.map((e) => e.statement.createdAt.getTime()))
      const latestB = Math.max(...b.entries.map((e) => e.statement.createdAt.getTime()))
      return latestB - latestA
    })

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: figure.name,
      description: figure.presentation,
      url: `https://debats.co/p/${figure.slug}`,
      image: `https://debats.co/avatars/${figure.slug}.jpg`,
      ...(Option.isSome(figure.wikipediaUrl) ? { sameAs: [figure.wikipediaUrl.value] } : {}),
    }

    return (
      <ContentWithSidebar topMargin>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <header className={styles.header}>
          <FigureAvatar slug={figure.slug} name={figure.name} size={120} />
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{figure.name}</h1>
            <p className={styles.presentation}>{figure.presentation}</p>
            {Option.isSome(figure.wikipediaUrl) && (
              <a
                href={figure.wikipediaUrl.value}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.wikiLink}
              >
                Voir sur Wikipedia
              </a>
            )}
          </div>
          {contributor && (
            <div>
              <Button
                href={`/nouvelle-prise-de-position?figureId=${figure.id}&figureName=${encodeURIComponent(figure.name)}`}
              >
                Ajouter une prise de position
              </Button>
            </div>
          )}
        </header>

        <section>
          <h2 className={styles.sectionTitle}>
            PRISES DE POSITION <span className={styles.count}>{statements.length}</span>
          </h2>

          {subjects.length === 0 ? (
            <p className={styles.emptyMessage}>Aucune prise de position enregistrée.</p>
          ) : (
            <div className={styles.subjectsList}>
              {subjects.map(({ subject, entries }) => (
                <div key={subject.id} className={styles.subjectItem}>
                  <Link href={`/p/${slug}/s/${subject.slug}`} className={styles.subjectContext}>
                    {subject.title}
                  </Link>
                  {entries.map(({ statement, position }) => (
                    <div key={statement.id} className={styles.positionBlock}>
                      <h3 className={styles.positionTitle}>
                        <span className={styles.positionLabel}>Sa position :</span> {position.title}
                      </h3>
                      <blockquote className={styles.quote}>{statement.quote}</blockquote>
                      {statement.sourceUrl ? (
                        <a
                          href={statement.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                        >
                          Source : {statement.sourceName}
                        </a>
                      ) : (
                        <span className={styles.sourceLink}>Source : {statement.sourceName}</span>
                      )}
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
