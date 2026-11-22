import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import { JOINT_DECLARATIONS_HREF } from '../../../domain/read-models/hrefs'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../components/layout/FormPageHeader'
import ReadingGuide from '../../../components/layout/ReadingGuide'
import NewJointDeclarationForm from './NewJointDeclarationForm'

export const metadata: Metadata = {
  title: 'Référencer une déclaration commune',
  description:
    'Référencer une tribune, un manifeste, un appel ou une lettre ouverte sur Débats.co.',
  robots: { index: false },
}

export default async function NewJointDeclarationPage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'add_joint_declaration')) {
    redirect(JOINT_DECLARATIONS_HREF)
  }

  return (
    <ContentWithSidebar
      topMargin
      hideLatestStatements
      aside={
        <ReadingGuide
          title="Ce qui est attendu"
          steps={[
            'Un texte public signé par plusieurs personnalités ou organisations : tribune, manifeste, appel, lettre ouverte.',
            'Une position par sujet, choisie parmi celles du sujet, avec la phrase du texte qui l’énonce.',
            'Les signataires s’ajoutent ensuite, depuis la page du texte : chacun·e prend toutes ses positions.',
          ]}
        />
      }
    >
      <FormPageHeader
        backHref={JOINT_DECLARATIONS_HREF}
        backLabel="Retour aux déclarations communes"
        title="Nouvelle déclaration commune"
        subtitle="Référencer un texte signé par plusieurs, et les positions qu’il prend"
      />

      <NewJointDeclarationForm />
    </ContentWithSidebar>
  )
}
