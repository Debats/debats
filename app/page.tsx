import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../infra/supabase/admin'
import { createSubjectRepository } from '../infra/database/subject-repository-supabase'
import { dailyIndex } from '../domain/services/daily-pick'
import ContentWithSidebar from '../components/layout/ContentWithSidebar'
import ActionLink from '../components/ui/ActionLink'
import HeroSection from './HeroSection'
import DailySubject from './DailySubject'
import SubjectSection from './SubjectSection'

const MOST_ACTIVE_LIMIT = 4
const RECENTLY_ADDED_LIMIT = 4

async function MostActiveSubjects() {
  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)

  const subjectIds = await Effect.runPromise(subjectRepo.findAllIds())
  const dailyId = subjectIds.length > 0 ? subjectIds[dailyIndex(subjectIds.length)] : undefined

  const subjects = await Effect.runPromise(
    subjectRepo.findSummariesByActivity(MOST_ACTIVE_LIMIT, dailyId),
  )
  return <SubjectSection title="Les plus actifs" subjects={subjects} />
}

async function RecentlyAddedSubjects() {
  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const subjects = await Effect.runPromise(
    subjectRepo.findSummariesByCreatedAt(RECENTLY_ADDED_LIMIT),
  )
  return <SubjectSection title="Derniers sujets ajoutés" subjects={subjects} />
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ContentWithSidebar>
        <DailySubject />
        <MostActiveSubjects />
        <RecentlyAddedSubjects />
        <ActionLink href="/s">Voir tous les sujets →</ActionLink>
      </ContentWithSidebar>
    </>
  )
}
