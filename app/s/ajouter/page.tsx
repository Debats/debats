import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../components/layout/FormPageHeader'
import NewSubjectForm from '../../../components/subjects/NewSubjectForm'

export const metadata: Metadata = {
  title: 'Ajouter un sujet',
  description: 'Proposer un nouveau sujet de débat sur Débats.co.',
}

export default async function AddSubjectPage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'add_subject')) {
    redirect('/s')
  }

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref="/s"
        backLabel="Retour aux sujets"
        title="Nouveau sujet"
        subtitle="Proposer un nouveau sujet de débat"
      />

      <NewSubjectForm />
    </ContentWithSidebar>
  )
}
