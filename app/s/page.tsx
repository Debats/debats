import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { createServerSupabaseClient } from '../../infra/supabase/ssr'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import ErrorDisplay from '../../components/layout/ErrorDisplay'
import SubjectCounters from '../../components/subjects/SubjectCounters'
import SubjectTitle from '../../components/subjects/SubjectTitle'
import styles from './subjects.module.css'

export const metadata: Metadata = {
  title: 'Sujets',
  description: 'Tous les sujets de débat référencés sur Débats.co avec les positions et personnalités associées.',
}

export default async function SubjectsPage() {
  try {
    const supabase = await createServerSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)

    const subjects = await Effect.runPromise(subjectRepo.findAll())

    const subjectsWithStats = await Promise.all(
      subjects.map(async (subject) => {
        const stats = await Effect.runPromise(subjectRepo.getStats(subject.id))
        return { subject, stats }
      }),
    )

    return (
      <ContentWithSidebar>
        <h1 className={styles.pageTitle}>LES DERNIERS SUJETS</h1>

        <div className={styles.subjectsIndex}>
          {subjectsWithStats.length === 0 ? (
            <p>Aucun sujet pour le moment.</p>
          ) : (
            subjectsWithStats.map(({ subject, stats }) => (
              <div key={subject.id} className={styles.subjectItem}>
                <div className={styles.subjectInfo}>
                  <SubjectTitle slug={subject.slug} title={subject.title} as="h2" />
                  <SubjectCounters
                    positionsCount={stats.positionsCount}
                    publicFiguresCount={stats.publicFiguresCount}
                  />
                </div>

                <div className={styles.subjectPresentation}>
                  <span className={styles.presentationLabel}>Résumé du sujet</span>
                  <p className={styles.presentationText}>{subject.presentation}</p>
                </div>

                <div className={styles.seeMore}>
                  <Link href={`/s/${subject.slug}`} className={styles.seeMoreLink}>
                    Voir les positions
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </ContentWithSidebar>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger les sujets."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
