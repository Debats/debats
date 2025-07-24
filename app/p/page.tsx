import Link from 'next/link'
import { Effect } from "effect"
import { publicFigureRepositorySupabase } from '../../infra/database/public-figure-repository-supabase'
import LastStatements from '../../components/layout/last-statements'
import styles from './personalities.module.css'

export default async function PersonalitiesPage() {
  try {
    const publicFigures = await Effect.runPromise(publicFigureRepositorySupabase.findAll())
    
    const publicFiguresWithStats = await Promise.all(
      publicFigures.map(async (figure) => {
        const stats = await Effect.runPromise(publicFigureRepositorySupabase.getStats(figure.id))
        return { figure, stats }
      })
    )
    
    return (
      <div className={styles.container}>
        <div className={styles.mainContent}>
          <h1 className={styles.pageTitle}>Les personnalités récentes</h1>
          
          <div className={styles.personalitiesIndex}>
            {publicFiguresWithStats.map(({ figure, stats }) => (
              <div key={figure.id} className={styles.personalityItem}>
                <div className={styles.personalityInfo}>
                  <div className={styles.personalityAvatar}>
                    <img 
                      src={figure.pictureUrl || '/images/default-avatar.png'} 
                      alt={figure.name}
                      className={styles.avatarImage}
                    />
                  </div>
                  <h3 className={styles.personalityName}>
                    <Link href={`/p/${figure.slug}`}>
                      {figure.name}
                    </Link>
                  </h3>
                  <div className={styles.personalityMeta}>
                    <span className={styles.personalityCategory}>
                      Homme Politique
                    </span>
                  </div>
                  <div className={styles.counters}>
                    <span className={styles.countItem}>
                      {stats.subjectsCount} sujets actifs
                    </span>
                  </div>
                </div>
                
                <div className={styles.personalityPresentation}>
                  <span className={styles.presentationLabel}>
                    Description personnalité
                  </span>
                  <div className={styles.presentationText}>
                    {figure.presentation}
                  </div>
                </div>
                
                <div className={styles.seeMore}>
                  <Link 
                    href={`/p/${figure.slug}`}
                    className={styles.seeMoreLink}
                  >
                    Voir les sujets actifs
                  </Link>
                </div>
              </div>
            ))}
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
        <p className={styles.errorMessage}>
          Impossible de charger les personnalités.
        </p>
        <p className={styles.errorDetail}>
          Erreur : {error instanceof Error ? error.message : 'Erreur inconnue'}
        </p>
      </div>
    )
  }
}