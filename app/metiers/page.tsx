import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOccupationRepository } from '../../infra/database/occupation-repository-supabase'
import { canPerform } from '../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import OccupationList from './OccupationList'
import NewOccupationForm from './NewOccupationForm'

export const metadata: Metadata = {
  title: 'Métiers',
  description:
    'Les métiers et fonctions des personnalités référencées sur Débats.co : qui parle, depuis quelle place.',
}

export default async function OccupationsPage() {
  const supabase = createAdminSupabaseClient()

  const [occupations, contributor] = await Promise.all([
    Effect.runPromise(createOccupationRepository(supabase).findAll()),
    getAuthenticatedContributor(),
  ])

  const canManage = !!contributor && canPerform(contributor.reputation, 'add_occupation')

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les métiers"
        intro="Les métiers et fonctions des personnalités : élu·es, syndicalistes, économistes, journalistes… Une personnalité peut en tenir plusieurs."
      />
      <ContentWithSidebar topMargin>
        <OccupationList
          occupations={occupations.map((o) => ({
            id: o.id,
            name: o.name,
            slug: o.slug,
            description: o.description,
          }))}
          canManage={canManage}
        />

        {canManage && <NewOccupationForm />}
      </ContentWithSidebar>
    </>
  )
}
