import { Metadata } from 'next'
import { Effect } from 'effect'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import ReadingGuide from '../../components/layout/ReadingGuide'
import SectionTabs from '../../components/ui/SectionTabs'
import { flagsViewHref, parseFlagsView, queueOf } from '../../domain/read-models/flag-queue'
import { countFlaggedEntities, describeEntities, loadFlags } from '../../infra/queries/flag-queue'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import FlaggedEntityRow from './FlaggedEntityRow'
import KindFilter from './KindFilter'
import { requireModerator } from './moderator'
import styles from './signalements.module.css'

export const metadata: Metadata = {
  title: 'Signalements',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ vue?: string; type?: string }>
}

const TO_SETTLE = 'À traiter'
const SETTLED = 'Traités'

/** The flags readers raised, for those who may settle them: the oldest first, by entity. */
export default async function FlagsPage({ searchParams }: PageProps) {
  await requireModerator()
  const view = parseFlagsView(await searchParams)

  // Settled flags are not public: the server's own client reads them, after the rank was checked
  const supabase = createAdminSupabaseClient()
  const [flags, waiting] = await Promise.all([
    Effect.runPromise(loadFlags(supabase, view)),
    Effect.runPromise(countFlaggedEntities(supabase)),
  ])
  const queue = queueOf(flags)
  const cards = await Effect.runPromise(
    describeEntities(
      supabase,
      queue.map(({ entity }) => entity),
    ),
  )

  return (
    <>
      <PageHero
        kicker="Relecture"
        title="Signalements"
        intro="Ce que les lecteur·rices ont relevé, et ce qu’on en a fait."
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <ReadingGuide
            title="Traiter un signalement"
            steps={[
              <>
                <strong>Ouvrez la source</strong> et comparez-la à ce qui est écrit.
              </>,
              <>
                <strong>Corrigez, écartez ou retirez.</strong> Corriger vaut toujours mieux que
                retirer.
              </>,
              <>
                <strong>Répondez.</strong> Dites ce que vous avez vérifié : votre réponse reste
                attachée au signalement.
              </>,
            ]}
          />
        }
      >
        <SectionTabs
          ariaLabel="Signalements à traiter ou traités"
          active={view.settled ? SETTLED : TO_SETTLE}
          tabs={[
            { label: TO_SETTLE, count: waiting, href: flagsViewHref({ ...view, settled: false }) },
            { label: SETTLED, href: flagsViewHref({ ...view, settled: true }) },
          ]}
        />
        <KindFilter view={view} />

        {queue.length === 0 ? (
          <p className={styles.empty}>
            {view.settled ? 'Aucun signalement traité.' : 'Aucun signalement à traiter.'}
          </p>
        ) : (
          <div className={styles.queue}>
            {queue.map((entry) => (
              <FlaggedEntityRow
                key={entry.entity.id}
                entry={entry}
                card={cards.get(entry.entity.id)}
                toSettle={!view.settled}
              />
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
