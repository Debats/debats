import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import NewSubjectForm from '../../../components/subjects/NewSubjectForm'
import styles from './ajouter.module.css'

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
      <header className={styles.header}>
        <Link href="/s" className={styles.backLink}>
          &larr; Retour aux sujets
        </Link>
        <h1 className={styles.title}>Nouveau sujet</h1>
        <p className={styles.subtitle}>Proposer un nouveau sujet de débat</p>
      </header>

      <NewSubjectForm />
    </ContentWithSidebar>
  )
}
