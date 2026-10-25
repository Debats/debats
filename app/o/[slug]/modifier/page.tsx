import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import { organisationStream } from '../../../../domain/aggregates/organisation'
import { currentRevision } from '../../../../infra/events/stream-revision'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import EditOrganisationForm from '../../../../components/organisations/EditOrganisationForm'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Modifier une organisation',
  description: 'Modifier une organisation sur Débats.co.',
}

export default async function EditOrganisationPage({ params }: PageProps) {
  const { slug } = await params

  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'edit_organisation')) {
    redirect(`/o/${slug}`)
  }

  const supabase = createAdminSupabaseClient()
  const organisation = await Effect.runPromise(
    createOrganisationRepository(supabase).findBySlug(slug),
  )

  if (!organisation) notFound()
  const revision = await currentRevision(organisationStream(organisation.id))

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={`/o/${slug}`}
        backLabel="Retour à l'organisation"
        title="Modifier l'organisation"
        subtitle={organisation.name}
      />

      <EditOrganisationForm
        organisationId={organisation.id}
        organisationSlug={organisation.slug}
        revision={revision}
        initialValues={{
          name: organisation.name,
          acronym: Option.getOrElse(organisation.acronym, () => ''),
          organisationType: organisation.organisationType,
          presentation: organisation.presentation,
          wikipediaUrl: Option.getOrElse(organisation.wikipediaUrl, () => ''),
          websiteUrl: Option.getOrElse(organisation.websiteUrl, () => ''),
          notorietySources: organisation.notorietySources,
        }}
      />
    </ContentWithSidebar>
  )
}
