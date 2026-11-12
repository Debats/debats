import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../infra/supabase/admin'
import { loadHomePage } from '../infra/queries/home-page'
import { debateLeanings, newestDebates } from '../domain/read-models/home-debates'
import ContentWithSidebar from '../components/layout/ContentWithSidebar'
import HeroSection from './HeroSection'
import DailySubject from './DailySubject'
import DebateLeanings from './DebateLeanings'
import LatestQuotes from './LatestQuotes'
import MovingDebates from './MovingDebates'
import NewSubjects from './NewSubjects'
import styles from './home.module.css'

const NEW_SUBJECTS = 5

/** How many subjects each side of « partagés / tranchés » shows */
const LEANING_SUBJECTS = 3

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
        <div className={styles.blocks}>
          {home.daily && <DailySubject daily={home.daily} />}
          <DebateLeanings leanings={debateLeanings(home.debates, LEANING_SUBJECTS)} />
          <MovingDebates moving={home.moving} />
        </div>
      </ContentWithSidebar>
    </>
  )
}
