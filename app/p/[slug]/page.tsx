import Link from "next/link"
import { notFound } from "next/navigation"
import { Effect } from "effect"
import { publicFigureRepositorySupabase } from "../../../infra/database/public-figure-repository-supabase"
import { statementRepositorySupabase } from "../../../infra/database/statement-repository-supabase"
import { StatementWithDetails } from "../../../domain/repositories/statement-repository"
import FigureAvatar from "../../../components/figures/FigureAvatar"
import ErrorDisplay from "../../../components/layout/ErrorDisplay"
import LastStatements from "../../../components/layout/last-statements"
import styles from "./personality-detail.module.css"

interface PageProps {
  params: Promise<{ slug: string }>
}

function groupBySubject(statements: StatementWithDetails[]) {
  return statements.reduce((acc, { statement, position, subject }) => {
    if (!acc[subject.id]) {
      acc[subject.id] = { subject, positions: [] }
    }
    acc[subject.id].positions.push({ statement, position })
    return acc
  }, {} as Record<string, {
    subject: StatementWithDetails["subject"]
    positions: { statement: StatementWithDetails["statement"]; position: StatementWithDetails["position"] }[]
  }>)
}

export default async function PersonalityDetailPage({ params }: PageProps) {
  const { slug } = await params

  try {
    const figure = await Effect.runPromise(
      publicFigureRepositorySupabase.findBySlug(slug)
    )

    if (!figure) notFound()

    const statements = await Effect.runPromise(
      statementRepositorySupabase.findByPublicFigureWithDetails(figure.id)
    )

    const subjectsMap = groupBySubject(statements)
    const subjects = Object.values(subjectsMap)

    return (
      <div className={styles.container}>
        <div className={styles.mainContent}>
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
                    <Link href={`/subjects/${subject.slug}`} className={styles.subjectContext}>
                      {subject.title}
                    </Link>
                    {positions.map(({ statement, position }) => (
                      <div key={statement.id} className={styles.positionBlock}>
                        <h3 className={styles.positionTitle}>
                          <span className={styles.positionLabel}>Sa position :</span> {position.title}
                        </h3>
                        <p className={styles.positionDescription}>{position.description}</p>
                        <a href="#" className={styles.viewArguments}>Voir les arguments</a>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sidebar}>
          <LastStatements />
        </aside>
      </div>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger la personnalité."
        detail={error instanceof Error ? error.message : "Erreur inconnue"}
      />
    )
  }
}
