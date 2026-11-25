import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../infra/supabase/admin'
import { loadHomePage } from '../infra/queries/home-page'
import AnalysesInvite from './AnalysesInvite'
import ContributeInvite from './ContributeInvite'
import DailySubject from './DailySubject'
import DeclarationShelf from './DeclarationShelf'
import FigureShelf from './FigureShelf'
import HeroSection from './HeroSection'
import LatestQuotes from './LatestQuotes'
import OrganisationShelf from './OrganisationShelf'
import SubjectShelf from './SubjectShelf'
import styles from './home.module.css'

export default async function HomePage() {
  // The page names the instant it renders at: the day's subject follows
  const home = await Effect.runPromise(loadHomePage(createAdminSupabaseClient(), new Date()))

  return (
    <>
      <HeroSection />
      <div className={styles.lead}>
        <div className={styles.daily}>{home.daily && <DailySubject daily={home.daily} />}</div>
        <aside className={styles.rail}>
          <div className={styles.railFrame}>
            <LatestQuotes entries={home.latest} />
          </div>
        </aside>
      </div>
      <div className={styles.shelves}>
        <SubjectShelf subjects={home.subjects} />
        <FigureShelf figures={home.publicFigures} />
        <OrganisationShelf organisations={home.organisations} />
        <DeclarationShelf declarations={home.declarations} />
        <AnalysesInvite />
        <ContributeInvite />
      </div>
    </>
  )
}
