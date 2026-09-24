import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import AddMembershipForm from '../../../../components/organisations/AddMembershipForm'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Affilier une personnalité',
  description: 'Relier une personnalité à une organisation sur Débats.co.',
}

export default async function AffiliatePage({ params }: PageProps) {
  const { slug } = await params

  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'add_membership')) {
    redirect(`/o/${slug}`)
  }

  const supabase = createAdminSupabaseClient()
  const organisation = await Effect.runPromise(
    createOrganisationRepository(supabase).findBySlug(slug),
  )

  if (!organisation) notFound()

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={`/o/${slug}`}
        backLabel={`Retour à ${organisation.name}`}
        title="Affilier une personnalité"
        subtitle={`Membre, élu·e, porte-parole, salarié·e… : qui fait partie de ${organisation.name} ?`}
      />
      <AddMembershipForm
        organisationId={organisation.id}
        organisationSlug={organisation.slug}
        organisationName={organisation.name}
      />
    </ContentWithSidebar>
  )
}
