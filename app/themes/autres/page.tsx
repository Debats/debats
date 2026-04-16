import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../components/layout/FormPageHeader'
import styles from '../[slug]/theme-detail.module.css'

export const metadata: Metadata = {
  title: 'Autres sujets',
  description: 'Sujets de débat non rattachés à une thématique.',
}

export default async function UnthemedSubjectsPage() {
  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)

  const unthemedIds = await Effect.runPromise(subjectRepo.findIdsWithoutPrimaryTheme())

  const summaries =
    unthemedIds.length > 0
      ? await Effect.runPromise(subjectRepo.findSummariesByIds(unthemedIds))
      : []

  const sortedSubjects = summaries.sort((a, b) => b.statementsCount - a.statementsCount)

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader backHref="/s" backLabel="Retour aux sujets" title="Autres sujets" />

      {sortedSubjects.length === 0 ? (
        <p className={styles.empty}>Aucun sujet sans thématique.</p>
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
