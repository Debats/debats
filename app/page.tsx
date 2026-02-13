import Link from 'next/link'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../infra/supabase/ssr'
import { createSubjectRepository } from '../infra/database/subject-repository-supabase'
import FigureAvatar from '../components/figures/FigureAvatar'
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
                  <div className={styles.avatarsRow}>
                    {subject.figures.map((figure) => (
                      <Link
                        key={figure.id}
                        href={`/p/${figure.slug}`}
                        className={styles.avatarLink}
                        title={figure.name}
                      >
                        <FigureAvatar slug={figure.slug} name={figure.name} size={40} />
                      </Link>
                    ))}
                  </div>
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
