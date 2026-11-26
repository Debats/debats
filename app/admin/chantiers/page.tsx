import { Metadata } from 'next'
import { Effect } from 'effect'
import { Chantier, ChantierMessage } from '../../../domain/entities/chantier'
import {
  ChantierListParams,
  listChantiers,
  parseChantierListView,
} from '../../../domain/read-models/chantier-list'
import { tallyDrafts } from '../../../domain/read-models/chantier-summary'
import { chantierCostCents } from '../../../domain/services/chantier-budget'
import { chantierSpend } from '../../../domain/use-cases/chantier-spend'
import { createChantierRepository } from '../../../infra/database/chantier-repository-supabase'
import { createDraftStatementRepository } from '../../../infra/database/draft-statement-repository-supabase'
import { liveServices } from '../../../infra/live-services'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { dollars } from '../../../lib/dollars'
import { getAdminContributor } from '../../actions/admin-guard'
import styles from '../drafts/admin-drafts.module.css'
import ChantierCard from './ChantierCard'
import ClosedChantiersLink from './ClosedChantiersLink'
import LaunchChantierForm from './LaunchChantierForm'
import listStyles from './chantiers.module.css'

export const metadata: Metadata = {
  title: 'Chantiers',
  robots: { index: false, follow: false },
}

/** The last thing the agent said in a conversation, if it said anything */
const lastAgentWord = (messages: ChantierMessage[]): ChantierMessage | null =>
  [...messages].reverse().find(({ role }) => role === 'agent') ?? null

interface Props {
  searchParams: Promise<ChantierListParams>
}

export default async function ChantiersPage({ searchParams }: Props) {
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
  const view = parseChantierListView(await searchParams)

  /* What the card of a chantier shows. The three readings at once: the session is asked while the base answers */
  const cardOf = (chantier: Chantier) =>
    Effect.all(
      {
        produced: drafts.findByChantier(chantier.id),
        messages: chantiers.findMessages(chantier.id),
        spend: Effect.provide(chantierSpend(chantier), services),
      },
      { concurrency: 'unbounded' },
    ).pipe(
      Effect.map(({ produced, messages, spend }) => ({
        chantier,
        tally: tallyDrafts(produced),
        spend,
        lastWord: lastAgentWord(messages),
      })),
    )

  /* A chantier the view hides is not read any further: neither its drafts, nor its thread, nor its session */
  const { cards, closedCount } = await Effect.runPromise(
    chantiers.findAll().pipe(
      Effect.map((all) => listChantiers(all, view)),
      Effect.flatMap(({ shown, closedCount }) =>
        Effect.forEach(shown, cardOf, { concurrency: 4 }).pipe(
          Effect.map((cards) => ({ cards, closedCount })),
        ),
      ),
    ),
  )

  /* What the chantiers listed cost together; a session that could not say what it spends leaves the sum short of it */
  const total = cards.reduce(
    (sum, { chantier, spend }) => sum + chantierCostCents(spend, chantier.earlierSpentCents),
    0,
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
        <p className={styles.empty}>
          {closedCount === 0 ? 'Aucun chantier pour l’instant.' : 'Aucun chantier ouvert.'}
        </p>
      ) : (
        <>
          <p className={listStyles.total}>
            Coût des chantiers ci-dessous : {dollars(total)} au tarif public, agents seuls. Un
            chantier supprimé emporte ce qu’il a coûté.
          </p>
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
        </>
      )}
      <ClosedChantiersLink view={view} closedCount={closedCount} />
    </div>
  )
}
