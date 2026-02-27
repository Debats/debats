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

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NouvellePositionPage({ searchParams }: PageProps) {
  const contributor = await getAuthenticatedContributor()

  if (!contributor) {
    redirect('/')
  }

  const params = await searchParams
  const figureId = typeof params.figureId === 'string' ? params.figureId : undefined
  const figureName = typeof params.figureName === 'string' ? params.figureName : undefined
  const subjectId = typeof params.subjectId === 'string' ? params.subjectId : undefined
  const subjectTitle = typeof params.subjectTitle === 'string' ? params.subjectTitle : undefined

  const initialFigure = figureId && figureName ? { id: figureId, name: figureName } : undefined
  const initialSubject =
    subjectId && subjectTitle ? { id: subjectId, title: subjectTitle } : undefined

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
          initialFigure={initialFigure}
          initialSubject={initialSubject}
        />
      </div>
    </ContentWithSidebar>
  )
}
