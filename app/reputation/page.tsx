import { redirect } from 'next/navigation'
import { Effect } from 'effect'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { getRank } from '../../domain/reputation/permissions'
import { actionLabel } from '../../domain/reputation/action-labels'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import styles from './reputation.module.css'

export const metadata = {
  title: 'Réputation — Débats.co',
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatAmount(amount: number): string {
  return amount > 0 ? `+${amount}` : `${amount}`
}

export default async function ReputationPage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor) {
    redirect(
      '/?notice=' + encodeURIComponent('Vous devez être connecté·e pour voir votre réputation.'),
    )
  }

  const supabase = await createSSRSupabaseClient()
  const repository = createReputationRepository(supabase)
  const events = await Effect.runPromise(repository.getHistory(contributor.id))
  const rank = getRank(contributor.reputation)

  return (
    <ContentWithSidebar topMargin>
      <div className={styles.header}>
        <h1 className={styles.title}>Réputation</h1>
        <div className={styles.summary}>
          <span className={styles.score}>{contributor.reputation} points</span>
          <span className={styles.rank}>{rank}</span>
        </div>
      </div>

      {events.length === 0 ? (
        <p className={styles.empty}>Aucun événement de réputation pour le moment.</p>
      ) : (
        <ul className={styles.list}>
          {events.map((event) => (
            <li key={event.id} className={styles.event}>
              <span className={styles.date}>{formatDate(event.createdAt)}</span>
              <span className={styles.label}>{actionLabel(event.action)}</span>
              <span
                className={`${styles.amount} ${event.amount >= 0 ? styles.positive : styles.negative}`}
              >
                {formatAmount(event.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ContentWithSidebar>
  )
}
