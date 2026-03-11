import { Metadata } from 'next'
import { Effect } from 'effect'
import { redirect } from 'next/navigation'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import NewStatementForm from '../../components/statements/NewStatementForm'
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
  let initialSubject: { id: string; title: string; slug?: string } | undefined
  if (subjectId && subjectTitle) {
    const supabase = await createSSRSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
    initialSubject = { id: subjectId, title: subjectTitle, slug: subject?.slug }
  }

  return (
    <ContentWithSidebar topMargin>
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>NOUVELLE PRISE DE POSITION</h1>
        <p className={styles.pageDescription}>
          Ajoutez une prise de position sourcée d&apos;une personnalité publique sur un sujet de
          débat.
        </p>
        <NewStatementForm initialFigure={initialFigure} initialSubject={initialSubject} />
      </div>
    </ContentWithSidebar>
  )
}
