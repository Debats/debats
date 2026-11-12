import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../infra/supabase/admin'
import { loadHomePage } from '../infra/queries/home-page'
import { newestDebates } from '../domain/read-models/home-debates'
import ContentWithSidebar from '../components/layout/ContentWithSidebar'
import HeroSection from './HeroSection'
import DailySubject from './DailySubject'
import LatestQuotes from './LatestQuotes'
import NewSubjects from './NewSubjects'

const NEW_SUBJECTS = 5

export default async function HomePage() {
  // The page names the instant it renders at: the day's subject and what counts as recent follow
  const home = await Effect.runPromise(loadHomePage(createAdminSupabaseClient(), new Date()))

  return (
    <>
      <HeroSection figures={home.figures} />
      <ContentWithSidebar
        hideLatestStatements
        stickyAside
        aside={
          <>
            <LatestQuotes entries={home.latest} />
            <NewSubjects subjects={newestDebates(home.debates, NEW_SUBJECTS)} />
          </>
        }
      >
        {home.daily && <DailySubject daily={home.daily} />}
      </ContentWithSidebar>
    </>
  )
}
