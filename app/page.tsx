import Link from 'next/link'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../infra/supabase/ssr'
import { createSubjectRepository } from '../infra/database/subject-repository-supabase'
import FigureAvatarRow from '../components/figures/FigureAvatarRow'
import ContentWithSidebar from '../components/layout/ContentWithSidebar'
import ErrorDisplay from '../components/layout/ErrorDisplay'
import SubjectCounters from '../components/subjects/SubjectCounters'
import SubjectTitle from '../components/subjects/SubjectTitle'
import styles from './home.module.css'

const HOMEPAGE_SUBJECTS_LIMIT = 20

export default async function HomePage() {
  try {
    const supabase = await createSSRSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)

    const subjects = await Effect.runPromise(
      subjectRepo.findSummariesByActivity(HOMEPAGE_SUBJECTS_LIMIT),
    )

    return (
      <>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Bienvenue sur Débats</h1>
          <p className={styles.heroSubtitle}>
            Débats est un projet participatif et collaboratif qui a pour objectif d&apos;offrir une
            synthèse ouverte, impartiale et vérifiable des sujets clivants de notre société.
          </p>
        </div>

        <ContentWithSidebar>
          <h2 className={styles.sectionTitle}>Sujets d&apos;actualité</h2>

          {subjects.length === 0 ? (
            <p className={styles.emptyMessage}>Aucun sujet pour le moment.</p>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className={styles.subjectItem}>
                <SubjectTitle slug={subject.slug} title={subject.title} />

                <SubjectCounters
                  positionsCount={subject.positionsCount}
                  publicFiguresCount={subject.publicFiguresCount}
                />

                {subject.figures.length > 0 && (
                  <FigureAvatarRow
                    figures={subject.figures}
                    totalCount={subject.publicFiguresCount}
                    size={40}
                    maxLines={2}
                  />
                )}

                <Link href={`/s/${subject.slug}`} className={styles.seeMoreLink}>
                  Voir plus de personnalités
                </Link>
              </div>
            ))
          )}
        </ContentWithSidebar>
      </>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger la page d'accueil."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
