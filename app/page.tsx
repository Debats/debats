import Link from "next/link"
import { Effect } from "effect"
import { subjectRepositorySupabase } from "../infra/database/subject-repository-supabase"
import { statementRepositorySupabase } from "../infra/database/statement-repository-supabase"
import { StatementWithFigure } from "../domain/repositories/statement-repository"
import FigureAvatar from "../components/figures/FigureAvatar"
import LastStatements from "../components/layout/last-statements"
import ErrorDisplay from "../components/layout/ErrorDisplay"
import styles from "./home.module.css"

export default async function HomePage() {
  try {
    const subjects = await Effect.runPromise(subjectRepositorySupabase.findAll())

    const subjectsWithData = await Promise.all(
      subjects.map(async (subject) => {
        const stats = await Effect.runPromise(
          subjectRepositorySupabase.getStats(subject.id)
        )
        const statementsWithFigures = await Effect.runPromise(
          statementRepositorySupabase.findBySubjectWithFigures(subject.id)
        )

        const uniqueFigures = deduplicateFigures(statementsWithFigures)

        return { subject, stats, figures: uniqueFigures }
      })
    )

    return (
      <>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Bienvenue sur Débats</h1>
          <p className={styles.heroSubtitle}>
            Débats est un projet participatif et collaboratif qui a pour objectif
            d&apos;offrir une synthèse ouverte, impartiale et vérifiable des sujets
            clivants de notre société.
          </p>
        </div>

        <div className={styles.container}>
          <div className={styles.mainContent}>
            <h2 className={styles.sectionTitle}>Sujets d&apos;actualité</h2>

            {subjectsWithData.length === 0 ? (
              <p className={styles.emptyMessage}>Aucun sujet pour le moment.</p>
            ) : (
              subjectsWithData.map(({ subject, stats, figures }) => (
                <div key={subject.id} className={styles.subjectItem}>
                  <h3 className={styles.subjectTitle}>
                    <Link href={`/subjects/${subject.slug}`}>
                      {subject.title}
                    </Link>
                  </h3>

                  <div className={styles.counters}>
                    <span className={styles.countItem}>
                      {stats.publicFiguresCount} personnalité
                      {stats.publicFiguresCount !== 1 ? "s" : ""} active
                      {stats.publicFiguresCount !== 1 ? "s" : ""}
                    </span>
                    <span className={styles.countItem}>
                      {stats.positionsCount} position
                      {stats.positionsCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {figures.length > 0 && (
                    <div className={styles.avatarsRow}>
                      {figures.map((figure) => (
                        <Link
                          key={figure.id}
                          href={`/p/${figure.slug}`}
                          className={styles.avatarLink}
                          title={figure.name}
                        >
                          <FigureAvatar
                            slug={figure.slug}
                            name={figure.name}
                            size={40}
                          />
                        </Link>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/subjects/${subject.slug}`}
                    className={styles.seeMoreLink}
                  >
                    Voir plus de personnalités
                  </Link>
                </div>
              ))
            )}
          </div>

          <div className={styles.sidebar}>
            <LastStatements />
          </div>
        </div>
      </>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger la page d'accueil."
        detail={error instanceof Error ? error.message : "Erreur inconnue"}
      />
    )
  }
}

function deduplicateFigures(statements: StatementWithFigure[]) {
  const seen = new Set<string>()
  const figures: Array<{ id: string; name: string; slug: string }> = []

  for (const s of statements) {
    const id = s.publicFigure.id
    if (!seen.has(id)) {
      seen.add(id)
      figures.push({
        id: s.publicFigure.id,
        name: s.publicFigure.name,
        slug: s.publicFigure.slug,
      })
    }
  }

  return figures
}
