import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../../../infra/supabase/ssr'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import NewPositionWizard from '../../../../components/positions/NewPositionWizard'
import ErrorDisplay from '../../../../components/layout/ErrorDisplay'
import styles from './nouvelle-position.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createSSRSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
    if (!subject) return { title: 'Sujet introuvable' }
    return {
      title: `Nouvelle position - ${subject.title}`,
    }
  } catch {
    return { title: 'Nouvelle position' }
  }
}

export default async function NewPositionPage({ params }: PageProps) {
  const { slug } = await params

  const contributor = await getAuthenticatedContributor()
  if (!contributor) {
    redirect(`/s/${slug}`)
  }

  try {
    const supabase = await createSSRSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)

    const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
    if (!subject) notFound()

    return (
      <ContentWithSidebar topMargin>
        <header className={styles.header}>
          <Link href={`/s/${slug}`} className={styles.backLink}>
            &larr; Retour au sujet
          </Link>
          <h1 className={styles.title}>{subject.title}</h1>
          <p className={styles.subtitle}>Proposer une nouvelle position</p>
        </header>

        <NewPositionWizard subjectId={subject.id} slug={slug} />
      </ContentWithSidebar>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger le formulaire."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
