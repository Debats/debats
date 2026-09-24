import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../components/layout/FormPageHeader'
import NewOrganisationForm from '../../../components/organisations/NewOrganisationForm'

export const metadata: Metadata = {
  title: 'Ajouter une organisation',
  description:
    'Ajouter un parti, une ONG, un syndicat, une entreprise ou un collectif sur Débats.co.',
}

export default async function AddOrganisationPage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'add_organisation')) {
    redirect('/o')
  }

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref="/o"
        backLabel="Retour aux organisations"
        title="Nouvelle organisation"
        subtitle="Un parti, une ONG, un syndicat, une entreprise, un lobby, une association ou un collectif qui prend part au débat public."
      />
      <NewOrganisationForm />
    </ContentWithSidebar>
  )
}
