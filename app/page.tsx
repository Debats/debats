import Link from 'next/link'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../infra/supabase/ssr'
import { createSubjectRepository } from '../infra/database/subject-repository-supabase'
import { SubjectActivitySummary } from '../domain/repositories/subject-repository'
import { dailyIndex } from '../domain/services/daily-pick'
import FigureAvatarRow from '../components/figures/FigureAvatarRow'
import ContentWithSidebar from '../components/layout/ContentWithSidebar'
import ErrorDisplay from '../components/layout/ErrorDisplay'
import SubjectCounters from '../components/subjects/SubjectCounters'
import SubjectTitle from '../components/subjects/SubjectTitle'
import styles from './home.module.css'

const MOST_ACTIVE_LIMIT = 4
const RECENTLY_ADDED_LIMIT = 4

function SubjectCardCompact({ subject }: { subject: SubjectActivitySummary }) {
  return (
    <div className={styles.subjectCompact}>
      <SubjectTitle slug={subject.slug} title={subject.title} />
      <SubjectCounters
        positionsCount={subject.positionsCount}
        publicFiguresCount={subject.publicFiguresCount}
      />
      {subject.figures.length > 0 && (
        <FigureAvatarRow
          figures={subject.figures}
          totalCount={subject.publicFiguresCount}
          size={36}
        />
      )}
    </div>
  )
}

export default async function HomePage() {
  try {
    const supabase = await createSSRSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)

    const [subjectIds, mostActive, recentlyAdded] = await Promise.all([
      Effect.runPromise(subjectRepo.findAllIds()),
      Effect.runPromise(subjectRepo.findSummariesByActivity(MOST_ACTIVE_LIMIT + 1)),
      Effect.runPromise(subjectRepo.findSummariesByCreatedAt(RECENTLY_ADDED_LIMIT)),
    ])

    const dailyId = subjectIds.length > 0 ? subjectIds[dailyIndex(subjectIds.length)] : null
    const dailySubject = dailyId
      ? await Effect.runPromise(subjectRepo.findSummaryById(dailyId))
      : null

    const activeWithoutDaily = mostActive
      .filter((s) => s.id !== dailySubject?.id)
      .slice(0, MOST_ACTIVE_LIMIT)

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
          {dailySubject && (
            <section className={styles.dailySection}>
              <h2 className={styles.sectionTitle}>Le sujet du jour</h2>
              <div className={styles.dailyCard}>
                <SubjectTitle slug={dailySubject.slug} title={dailySubject.title} as="h3" />
                <p className={styles.dailyPresentation}>{dailySubject.presentation}</p>
                <SubjectCounters
                  positionsCount={dailySubject.positionsCount}
                  publicFiguresCount={dailySubject.publicFiguresCount}
                />
                {dailySubject.figures.length > 0 && (
                  <FigureAvatarRow
                    figures={dailySubject.figures}
                    totalCount={dailySubject.publicFiguresCount}
                    size={44}
                    maxLines={2}
                  />
                )}
                <Link href={`/s/${dailySubject.slug}`} className={styles.dailyLink}>
                  Découvrir les positions
                </Link>
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Les plus actifs</h2>
            {activeWithoutDaily.length === 0 ? (
              <p className={styles.emptyMessage}>Aucun sujet pour le moment.</p>
            ) : (
              <div className={styles.subjectGrid}>
                {activeWithoutDaily.map((subject) => (
                  <SubjectCardCompact key={subject.id} subject={subject} />
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Derniers sujets ajoutés</h2>
            {recentlyAdded.length === 0 ? (
              <p className={styles.emptyMessage}>Aucun sujet pour le moment.</p>
            ) : (
              <div className={styles.subjectGrid}>
                {recentlyAdded.map((subject) => (
                  <SubjectCardCompact key={subject.id} subject={subject} />
                ))}
              </div>
            )}
          </section>

          <Link href="/s" className={styles.viewAllLink}>
            Voir tous les sujets →
          </Link>
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
