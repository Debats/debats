import { Metadata } from 'next'
import Link from 'next/link'
import { Effect, Either } from 'effect'
import { refreshChantierUseCase } from '../../../../domain/use-cases/refresh-chantier'
import { resolveDraft } from '../../../../domain/use-cases/resolve-draft'
import { createDraftStatementRepository } from '../../../../infra/database/draft-statement-repository-supabase'
import { liveServices, runLive } from '../../../../infra/live-services'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { getAdminContributor } from '../../../actions/admin-guard'
import styles from '../../drafts/admin-drafts.module.css'
import DraftList from '../../drafts/DraftList'
import ChantierWorkspace from '../ChantierWorkspace'
import { CHANTIERS_PATH } from '../hrefs'

export const metadata: Metadata = {
  title: 'Chantier',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ id: string }>
}

/**
 * A chantier opened: brought up to date with its session first, then its
 * drafts as the review page shows them, and the conversation beside them.
 */
export default async function ChantierPage({ params }: Props) {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return (
      <div className={styles.container}>
        <p className={styles.accessDenied}>Accès refusé.</p>
      </div>
    )
  }

  const { id } = await params
  const supabase = createAdminSupabaseClient()
  const refreshed = await runLive(refreshChantierUseCase({ contributor, chantierId: id }), supabase)
  if (Either.isLeft(refreshed)) {
    return (
      <div className={styles.container}>
        <Link href={CHANTIERS_PATH} className={styles.backLink}>
          ← Chantiers
        </Link>
        <p className={styles.empty}>{refreshed.left}</p>
      </div>
    )
  }

  const { chantier, messages } = refreshed.right
  const services = liveServices(supabase)
  const drafts = await Effect.runPromise(
    Effect.flatMap(createDraftStatementRepository(supabase).findByChantier(chantier.id), (all) =>
      Effect.forEach(
        all,
        (draft) =>
          Effect.map(Effect.provide(resolveDraft(draft), services), (resolution) => ({
            draft,
            resolution,
          })),
        { concurrency: 4 },
      ),
    ),
  )

  return (
    <div className={styles.container}>
      <Link href={CHANTIERS_PATH} className={styles.backLink}>
        ← Chantiers
      </Link>
      <ChantierWorkspace chantier={chantier} messages={messages} draftCount={drafts.length}>
        {drafts.length === 0 ? (
          <p className={styles.empty}>Aucun brouillon pour l’instant.</p>
        ) : (
          <DraftList drafts={drafts} view={{ grouping: 'subject' }} />
        )}
      </ChantierWorkspace>
    </div>
  )
}
