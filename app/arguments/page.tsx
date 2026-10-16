import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import ArgumentCard from './ArgumentCard'
import styles from './arguments.module.css'

export const metadata: Metadata = {
  title: 'Arguments',
  description:
    'Les raisonnements mobilisés dans le débat public, et sur quels sujets ils servent : Débats.co cartographie les arguments, pas seulement les camps.',
}

export default async function ArgumentsPage() {
  const supabase = createAdminSupabaseClient()
  const summaries = await Effect.runPromise(createArgumentRepository(supabase).findSummaries())

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les arguments"
        intro="Un argument est un principe ou un raisonnement qu'une prise de position avance, et qui peut servir sur plusieurs sujets. Du plus mobilisé au moins mobilisé."
      />

      <ContentWithSidebar topMargin>
        {summaries.length === 0 ? (
          <p className={styles.empty}>
            Aucun argument n&apos;est encore recensé. Les arguments se proposent au moment
            d&apos;ajouter une prise de position, par les contributeur·ices de rang Éloquent.
          </p>
        ) : (
          <div className={styles.grid}>
            {summaries.map((argument) => (
              <ArgumentCard key={argument.id} argument={argument} />
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
