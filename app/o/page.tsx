import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import {
  ORGANISATIONS_PER_GROUP,
  groupOrganisationsByType,
} from '../../domain/read-models/organisation-summary'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import Button from '../../components/ui/Button'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import OrganisationSearch from '../../components/organisations/OrganisationSearch'
import OrganisationTypeSection from '../../components/organisations/OrganisationTypeSection'
import styles from './organisations.module.css'

export const metadata: Metadata = {
  title: 'Organisations',
  description:
    'Les partis, ONG, syndicats, entreprises et collectifs référencés sur Débats.co, et les personnalités qui en font partie.',
}

export default async function OrganisationsPage() {
  const supabase = createAdminSupabaseClient()
  const repo = createOrganisationRepository(supabase)

  const [organisations, contributor] = await Promise.all([
    Effect.runPromise(repo.findSummaries()),
    getAuthenticatedContributor(),
  ])
  const canAdd = !!contributor && canPerform(contributor.reputation, 'add_organisation')
  const groups = groupOrganisationsByType(organisations, ORGANISATIONS_PER_GROUP)

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les organisations"
        intro="Partis, ONG, syndicats, entreprises et collectifs : qui s'engage dans le débat public, et qui en fait partie."
        actions={canAdd && <Button href="/o/ajouter">Ajouter une organisation</Button>}
      >
        <OrganisationSearch />
      </PageHero>

      <ContentWithSidebar topMargin>
        {groups.length === 0 ? (
          <p className={styles.empty}>
            Aucune organisation n&apos;est encore référencée. Les contributeur·ices de rang Éloquent
            peuvent en ajouter.
          </p>
        ) : (
          groups.map((group) => <OrganisationTypeSection key={group.type} group={group} />)
        )}
      </ContentWithSidebar>
    </>
  )
}
