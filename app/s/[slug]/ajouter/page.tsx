import { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../../../infra/database/position-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import AddStatementForm from '../../../../components/statements/AddStatementForm'
import styles from './ajouter.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
    if (!subject) return { title: 'Sujet introuvable' }
    return {
      title: `Ajouter une prise de position - ${subject.title}`,
    }
  } catch {
    return { title: 'Ajouter une prise de position' }
  }
}

export default async function AddStatementPage({ params }: PageProps) {
  const { slug } = await params

  const contributor = await getAuthenticatedContributor()
  if (!contributor) {
    redirect(`/s/${slug}`)
  }

  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const positionRepo = createPositionRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
  if (!subject) notFound()

  const positions = await Effect.runPromise(positionRepo.findBySubjectId(subject.id))

  return (
    <ContentWithSidebar topMargin>
      <header className={styles.header}>
        <Link href={`/s/${slug}`} className={styles.backLink}>
          &larr; Retour au sujet
        </Link>
        <h1 className={styles.title}>{subject.title}</h1>
        <p className={styles.subtitle}>Ajouter une prise de position</p>
      </header>

      {positions.length === 0 ? (
        <p className={styles.emptyMessage}>
          Ce sujet n&apos;a pas encore de positions. Ajoutez d&apos;abord des positions avant de
          pouvoir ajouter une prise de position.
        </p>
      ) : (
        <AddStatementForm
          subjectId={subject.id}
          slug={slug}
          positions={positions.map((p) => ({ id: p.id, title: p.title }))}
        />
      )}
    </ContentWithSidebar>
  )
}
