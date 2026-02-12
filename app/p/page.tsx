import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { createServerSupabaseClient } from '../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import FigureAvatar from '../../components/figures/FigureAvatar'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import ErrorDisplay from '../../components/layout/ErrorDisplay'
import styles from './personalities.module.css'

export const metadata: Metadata = {
  title: 'Personnalités',
  description: 'Les personnalités publiques référencées sur Débats.co et leurs prises de position sur les sujets de société.',
}

export default async function PersonalitiesPage() {
  try {
    const supabase = await createServerSupabaseClient()
    const publicFigureRepo = createPublicFigureRepository(supabase)

    const publicFigures = await Effect.runPromise(publicFigureRepo.findAll())

    const publicFiguresWithStats = await Promise.all(
      publicFigures.map(async (figure) => {
        const stats = await Effect.runPromise(publicFigureRepo.getStats(figure.id))
        return { figure, stats }
      }),
    )

    publicFiguresWithStats.sort((a, b) => b.stats.subjectsCount - a.stats.subjectsCount)

    return (
      <ContentWithSidebar topMargin>
        <h1 className={styles.pageTitle}>LES PERSONNALITÉS</h1>

        <div className={styles.personalitiesIndex}>
          {publicFiguresWithStats.length === 0 ? (
            <p>Aucune personnalité pour le moment.</p>
          ) : (
            publicFiguresWithStats.map(({ figure, stats }) => (
              <div key={figure.id} className={styles.personalityItem}>
                <div className={styles.personalityIdentity}>
                  <div className={styles.personalityAvatar}>
                    <FigureAvatar slug={figure.slug} name={figure.name} />
                  </div>
                  <h3 className={styles.personalityName}>
                    <Link href={`/p/${figure.slug}`}>{figure.name}</Link>
                  </h3>
                  <div className={styles.counters}>
                    <span className={styles.countItem}>
                      {stats.subjectsCount} sujet
                      {stats.subjectsCount !== 1 ? 's' : ''} actif
                      {stats.subjectsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className={styles.personalityPresentation}>
                  <span className={styles.presentationLabel}>Homme Politique</span>
                  <p className={styles.presentationText}>{figure.presentation}</p>
                </div>

                <div className={styles.seeMore}>
                  <Link href={`/p/${figure.slug}`} className={styles.seeMoreLink}>
                    Voir les sujets actifs
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
        message="Impossible de charger les personnalités."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
