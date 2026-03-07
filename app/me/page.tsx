import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { getRank, getNextRankThreshold } from '../../domain/reputation/permissions'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import Button from '../../components/ui/Button'
import styles from './me.module.css'

export const metadata = {
  title: 'Mon compte — Débats.co',
}

function formatScore(n: number): string {
  return n.toLocaleString('fr-FR')
}

export default async function MePage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor) {
    redirect(
      '/?notice=' + encodeURIComponent('Vous devez être connecté·e pour accéder à votre profil.'),
    )
  }

  const displayName = contributor.name ?? contributor.email ?? 'Contributeur·rice'
  const rank = getRank(contributor.reputation)
  const nextThreshold = getNextRankThreshold(contributor.reputation)
  const progress = nextThreshold
    ? Math.min((contributor.reputation / nextThreshold) * 100, 100)
    : 100

  return (
    <ContentWithSidebar topMargin>
      <h1 className={styles.title}>Mon compte</h1>

      <div className={styles.identity}>
        <div className={styles.identityInfo}>
          <span className={styles.displayName}>{displayName}</span>
          {contributor.name && contributor.email && (
            <span className={styles.email}>{contributor.email}</span>
          )}
        </div>
        <Button href="/inviter" size="small">
          Inviter
        </Button>
      </div>

      <div className={styles.reputationCard}>
        <div className={styles.reputationHeader}>
          <div className={styles.reputationScore}>
            <span className={styles.score}>{formatScore(contributor.reputation)}</span>
            <span className={styles.scoreLabel}>points</span>
          </div>
          <span className={styles.rank}>{rank}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        {nextThreshold && (
          <span className={styles.progressLabel}>
            {formatScore(nextThreshold - contributor.reputation)} pts avant le prochain rang
          </span>
        )}
        <Link href="/reputation" className={styles.historyLink}>
          Voir l&apos;historique
        </Link>
      </div>
    </ContentWithSidebar>
  )
}
