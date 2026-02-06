import Link from "next/link"
import { Effect } from "effect"
import { subjectRepositorySupabase } from "../../infra/database/subject-repository-supabase"
import LastStatements from "../../components/layout/last-statements"
import styles from "./subjects.module.css"

export default async function SubjectsPage() {
  try {
    const subjects = await Effect.runPromise(subjectRepositorySupabase.findAll())

    const subjectsWithStats = await Promise.all(
      subjects.map(async (subject) => {
        const stats = await Effect.runPromise(
          subjectRepositorySupabase.getStats(subject.id)
        )
        return { subject, stats }
      })
    )

    return (
      <div className={styles.container}>
        <div className={styles.mainContent}>
          <h1 className={styles.pageTitle}>LES DERNIERS SUJETS</h1>

          <div className={styles.subjectsIndex}>
            {subjectsWithStats.length === 0 ? (
              <p>Aucun sujet pour le moment.</p>
            ) : (
              subjectsWithStats.map(({ subject, stats }) => (
                <div key={subject.id} className={styles.subjectItem}>
                  <div className={styles.subjectInfo}>
                    <h2 className={styles.subjectTitle}>
                      <Link href={`/subjects/${subject.slug}`}>
                        {subject.title}
                      </Link>
                    </h2>
                    <div className={styles.counters}>
                      <span className={styles.countItem}>
                        {stats.positionsCount} position
                        {stats.positionsCount !== 1 ? "s" : ""}
                      </span>
                      <span className={styles.countItem}>
                        {stats.publicFiguresCount} personnalité
                        {stats.publicFiguresCount !== 1 ? "s" : ""} active
                        {stats.publicFiguresCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className={styles.subjectPresentation}>
                    <span className={styles.presentationLabel}>
                      Résumé du sujet
                    </span>
                    <p className={styles.presentationText}>
                      {subject.presentation}
                    </p>
                  </div>

                  <div className={styles.seeMore}>
                    <Link
                      href={`/subjects/${subject.slug}`}
                      className={styles.seeMoreLink}
                    >
                      Voir les positions
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          <LastStatements />
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>Erreur</h1>
        <p className={styles.errorMessage}>Impossible de charger les sujets.</p>
        <p className={styles.errorDetail}>
          Erreur : {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
      </div>
    )
  }
}