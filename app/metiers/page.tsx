import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOccupationRepository } from '../../infra/database/occupation-repository-supabase'
import { createOccupationFamilyRepository } from '../../infra/database/occupation-family-repository-supabase'
import { groupOccupationsByFamily } from '../../domain/read-models/occupations'
import {
  countFiguresByFamily,
  countFiguresByOccupation,
} from '../../domain/services/occupation-distribution'
import { canPerform } from '../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import FamilyList from './FamilyList'
import NewOccupationFamilyForm from './NewOccupationFamilyForm'
import NewOccupationForm from './NewOccupationForm'

export const metadata: Metadata = {
  title: 'Métiers',
  description:
    'Les métiers et fonctions des personnalités référencées sur Débats.co, par famille : qui parle, depuis quelle place.',
}

export default async function OccupationsPage() {
  const supabase = createAdminSupabaseClient()

  const occupationRepo = createOccupationRepository(supabase)

  const [families, occupations, assignments, contributor] = await Promise.all([
    Effect.runPromise(createOccupationFamilyRepository(supabase).findAll()),
    Effect.runPromise(occupationRepo.findAll()),
    Effect.runPromise(occupationRepo.findAllAssignments()),
    getAuthenticatedContributor(),
  ])

  const canManage = !!contributor && canPerform(contributor.reputation, 'add_occupation')
  const byFamily = countFiguresByFamily(assignments, occupations)
  const byOccupation = countFiguresByOccupation(assignments)
  const groups = groupOccupationsByFamily(families, occupations).map(({ family, occupations }) => ({
    family: {
      id: family.id,
      name: family.name,
      slug: family.slug,
      description: family.description,
      figuresCount: byFamily.get(family.id) ?? 0,
    },
    occupations: occupations.map(({ id, name }) => ({
      id,
      name,
      figuresCount: byOccupation.get(id) ?? 0,
    })),
  }))

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les métiers"
        intro="Les métiers et fonctions des personnalités, regroupés par famille : élu·es, exécutif, syndicalistes, chercheur·ses, journalistes… Une personnalité peut en tenir plusieurs."
      />
      <ContentWithSidebar topMargin>
        <FamilyList groups={groups} canManage={canManage} />

        {canManage && (
          <>
            <NewOccupationForm families={groups.map(({ family }) => family)} />
            <NewOccupationFamilyForm />
          </>
        )}
      </ContentWithSidebar>
    </>
  )
}
