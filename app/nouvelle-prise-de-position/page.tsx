import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import ContributeStatementForm from '../../components/contributions/ContributeStatementForm'
import styles from './nouvelle-prise-de-position.module.css'

export const metadata: Metadata = {
  title: 'Nouvelle prise de position',
  description: 'Ajouter une prise de position sourcée sur Débats.co.',
}

export default async function NouvellePositionPage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor) {
    redirect('/')
  }

  const canAddPersonality = canPerform(contributor.reputation, 'add_personality')
  const canAddSubject = canPerform(contributor.reputation, 'add_subject')
  const canAddPosition = canPerform(contributor.reputation, 'add_position')

  return (
    <ContentWithSidebar topMargin>
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>NOUVELLE PRISE DE POSITION</h1>
        <p className={styles.pageDescription}>
          Ajoutez une prise de position sourcée d&apos;une personnalité publique sur un sujet de
          débat.
        </p>
        <ContributeStatementForm
          canAddPersonality={canAddPersonality}
          canAddSubject={canAddSubject}
          canAddPosition={canAddPosition}
        />
      </div>
    </ContentWithSidebar>
  )
}
