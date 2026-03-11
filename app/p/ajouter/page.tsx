import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import NewPublicFigureForm from '../../../components/figures/NewPublicFigureForm'
import styles from './ajouter.module.css'

export const metadata: Metadata = {
  title: 'Ajouter une personnalité',
  description: 'Ajouter une personnalité publique sur Débats.co.',
}

export default async function AddPublicFigurePage() {
  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'add_personality')) {
    redirect('/p')
  }

  return (
    <ContentWithSidebar topMargin>
      <header className={styles.header}>
        <Link href="/p" className={styles.backLink}>
          &larr; Retour aux personnalités
        </Link>
        <h1 className={styles.title}>Nouvelle personnalité</h1>
        <p className={styles.subtitle}>Ajouter une personnalité publique</p>
      </header>

      <NewPublicFigureForm />
    </ContentWithSidebar>
  )
}
