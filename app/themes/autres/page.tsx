import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import PageHero from '../../../components/layout/PageHero'
import SubjectCard from '../../../components/subjects/SubjectCard'
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
    <>
      <PageHero
        kicker="Thématique"
        title="Autres sujets"
        intro="Les sujets qui n'ont pas encore de thématique principale."
      />
      <ContentWithSidebar topMargin>
        {sortedSubjects.length === 0 ? (
          <p className={styles.empty}>Aucun sujet sans thématique.</p>
        ) : (
          <div className={styles.subjectList}>
            {sortedSubjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
