import { Metadata } from 'next'
import Link from 'next/link'
import { Effect, Either } from 'effect'
import { tallyDrafts, tallyLine } from '../../../../domain/read-models/chantier-summary'
import { refreshChantierUseCase } from '../../../../domain/use-cases/refresh-chantier'
import { resolveDraft } from '../../../../domain/use-cases/resolve-draft'
import { createDraftStatementRepository } from '../../../../infra/database/draft-statement-repository-supabase'
import { liveServices, runLive } from '../../../../infra/live-services'
import { statementWhereabouts } from '../../../../infra/queries/statement-whereabouts'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { getAdminContributor } from '../../../actions/admin-guard'
import { chantierSections } from '../../../../domain/read-models/chantier-sections'
import styles from '../../drafts/admin-drafts.module.css'
import ChantierSections from '../ChantierSections'
import ChantierWorkspace from '../ChantierWorkspace'
import SettledDrafts from '../SettledDrafts'
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

  const { chantier, messages, budget, reviewsWaiting, sourcesNoted } = refreshed.right
  const services = liveServices(supabase)
  const produced = await Effect.runPromise(
    createDraftStatementRepository(supabase).findByChantier(chantier.id),
  )
  /* The review cards are for what is waiting: a settled draft is only listed */
  const settled = produced.filter(({ status }) => status !== 'pending')
  const whereabouts = await Effect.runPromise(
    statementWhereabouts(
      supabase,
      settled.flatMap(({ validation }) => (validation ? [validation.statementId] : [])),
    ),
  )
  const pending = await Effect.runPromise(
    Effect.forEach(
      produced.filter(({ status }) => status === 'pending'),
      (draft) =>
        Effect.map(Effect.provide(resolveDraft(draft), services), (resolution) => ({
          draft,
          resolution,
        })),
      { concurrency: 4 },
    ),
  )

  return (
    <div className={styles.container}>
      <Link href={CHANTIERS_PATH} className={styles.backLink}>
        ← Chantiers
      </Link>
      <ChantierWorkspace
        chantier={chantier}
        messages={messages}
        budget={budget}
        reviewsWaiting={reviewsWaiting}
        sourcesNoted={sourcesNoted}
        tally={tallyLine(tallyDrafts(produced))}
      >
        {pending.length === 0 ? (
          <p className={styles.empty}>
            {produced.length === 0 ? 'Aucun brouillon pour l’instant.' : 'Rien à relire.'}
          </p>
        ) : (
          <ChantierSections sections={chantierSections(pending, chantier.sections)} />
        )}
        <SettledDrafts drafts={settled} whereabouts={whereabouts} />
      </ChantierWorkspace>
    </div>
  )
}
