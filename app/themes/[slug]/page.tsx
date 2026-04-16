import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { createThemeRepository } from '../../../infra/database/theme-repository-supabase'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../components/layout/FormPageHeader'
import styles from './theme-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const themeRepo = createThemeRepository(supabase)
    const theme = await Effect.runPromise(themeRepo.findBySlug(slug))
    if (!theme) return { title: 'Thématique introuvable' }
    return {
      title: `${theme.name} — Thématique`,
      description: theme.description,
    }
  } catch {
    return { title: 'Thématique' }
  }
}

export default async function ThemeDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const themeRepo = createThemeRepository(supabase)
  const subjectRepo = createSubjectRepository(supabase)

  const theme = await Effect.runPromise(themeRepo.findBySlug(slug))
  if (!theme) notFound()

  const subjectIds = await Effect.runPromise(themeRepo.findSubjectIdsByThemeId(theme.id))
  const summaries =
    subjectIds.length > 0 ? await Effect.runPromise(subjectRepo.findSummariesByIds(subjectIds)) : []

  const sortedSubjects = summaries.sort((a, b) => b.statementsCount - a.statementsCount)

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader backHref="/s" backLabel="Retour aux sujets" title={theme.name} />
      <p className={styles.description}>{theme.description}</p>

      {sortedSubjects.length === 0 ? (
        <p className={styles.empty}>Aucun sujet dans cette thématique.</p>
      ) : (
        <div className={styles.subjectList}>
          {sortedSubjects.map((subject) => (
            <Link key={subject.id} href={`/s/${subject.slug}`} className={styles.subjectCard}>
              <h2 className={styles.subjectTitle}>{subject.title}</h2>
              <p className={styles.subjectPresentation}>{subject.presentation}</p>
              <span className={styles.subjectStats}>
                {subject.statementsCount} prise{subject.statementsCount !== 1 ? 's' : ''} de
                position · {subject.publicFiguresCount} personnalité
                {subject.publicFiguresCount !== 1 ? 's' : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </ContentWithSidebar>
  )
}
