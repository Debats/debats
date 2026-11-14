import { Metadata } from 'next'
import { Effect } from 'effect'
import { Chantier, ChantierMessage } from '../../../domain/entities/chantier'
import { tallyDrafts } from '../../../domain/read-models/chantier-summary'
import { chantierSpend } from '../../../domain/use-cases/chantier-spend'
import { createChantierRepository } from '../../../infra/database/chantier-repository-supabase'
import { createDraftStatementRepository } from '../../../infra/database/draft-statement-repository-supabase'
import { liveServices } from '../../../infra/live-services'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { getAdminContributor } from '../../actions/admin-guard'
import styles from '../drafts/admin-drafts.module.css'
import ChantierCard from './ChantierCard'
import LaunchChantierForm from './LaunchChantierForm'
import listStyles from './chantiers.module.css'

export const metadata: Metadata = {
  title: 'Chantiers',
  robots: { index: false, follow: false },
}

/** The last thing the agent said in a conversation, if it said anything */
const lastAgentWord = (messages: ChantierMessage[]): ChantierMessage | null =>
  [...messages].reverse().find(({ role }) => role === 'agent') ?? null

export default async function ChantiersPage() {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return (
      <div className={styles.container}>
        <p className={styles.accessDenied}>Accès refusé.</p>
      </div>
    )
  }

  const supabase = createAdminSupabaseClient()
  const chantiers = createChantierRepository(supabase)
  const drafts = createDraftStatementRepository(supabase)
  const services = liveServices(supabase)

  const cards = await Effect.runPromise(
    Effect.flatMap(chantiers.findAll(), (all: Chantier[]) =>
      Effect.forEach(
        all,
        (chantier) =>
          Effect.map(
            /* The three readings at once: the session is asked while the base answers */
            Effect.all(
              {
                produced: drafts.findByChantier(chantier.id),
                messages: chantiers.findMessages(chantier.id),
                spend: Effect.provide(chantierSpend(chantier), services),
              },
              { concurrency: 'unbounded' },
            ),
            ({ produced, messages, spend }) => ({
              chantier,
              tally: tallyDrafts(produced),
              spend,
              lastWord: lastAgentWord(messages),
            }),
          ),
        { concurrency: 4 },
      ),
    ),
  )

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>CHANTIERS</h1>
      <p className={listStyles.lead}>
        Un chantier part d’une consigne, produit des brouillons, et garde la conversation qui les a
        faits. Vous relisez ; l’agent cherche, vérifie et retouche.
      </p>

      <LaunchChantierForm />

      {cards.length === 0 ? (
        <p className={styles.empty}>Aucun chantier pour l’instant.</p>
      ) : (
        <div className={listStyles.list}>
          {cards.map(({ chantier, tally, spend, lastWord }) => (
            <ChantierCard
              key={chantier.id}
              chantier={chantier}
              tally={tally}
              spend={spend}
              lastWord={lastWord}
            />
          ))}
        </div>
      )}
    </div>
  )
}
