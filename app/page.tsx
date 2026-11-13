import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../infra/supabase/admin'
import { loadHomePage } from '../infra/queries/home-page'
import { pairsToShow } from '../domain/read-models/figure-agreements'
import { debateLeanings, debateMap, newestDebates } from '../domain/read-models/home-debates'
import { parseReviewSkip } from '../domain/read-models/home-page'
import { latestChanges } from '../domain/read-models/position-changes'
import { viewerOf } from '../domain/read-models/review'
import ContentWithSidebar from '../components/layout/ContentWithSidebar'
import { getAuthenticatedContributor } from './actions/get-authenticated-contributor'
import HeroSection from './HeroSection'
import DailySubject from './DailySubject'
import DebateLeanings from './DebateLeanings'
import DebateMap from './DebateMap'
import FigurePairs from './FigurePairs'
import LatestQuotes from './LatestQuotes'
import MovingDebates from './MovingDebates'
import NewSubjects from './NewSubjects'
import PositionChanges from './PositionChanges'
import ReviewInvite from './ReviewInvite'
import styles from './home.module.css'

const NEW_SUBJECTS = 5

/** How many subjects each side of « partagés / tranchés » shows */
const LEANING_SUBJECTS = 3

/** What the map of debates has room for */
const MAP_ROOM = { themes: 6, subjectsPerTheme: 2 }

const PAIRS = 4

const CHANGES = 2

interface PageProps {
  searchParams: Promise<{ relire?: string }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const skip = parseReviewSkip((await searchParams).relire)
  const contributor = await getAuthenticatedContributor()
  // The page names the instant it renders at: the day's subject and what counts as recent follow
  const home = await Effect.runPromise(
    loadHomePage(createAdminSupabaseClient(), new Date(), { id: contributor?.id ?? null, skip }),
  )

  return (
    <>
      <HeroSection figures={home.figures} />
      <ContentWithSidebar
        hideLatestStatements
        stickyAside
        aside={
          <>
            <LatestQuotes entries={home.latest} />
            <NewSubjects
              subjects={newestDebates(home.debates, NEW_SUBJECTS)}
              signedIn={!!contributor}
            />
          </>
        }
      >
        <div className={styles.blocks}>
          {home.daily && <DailySubject daily={home.daily} />}
          <DebateMap map={debateMap(home.debates, MAP_ROOM)} />
          <DebateLeanings leanings={debateLeanings(home.debates, LEANING_SUBJECTS)} />
          <MovingDebates moving={home.moving} />
          <FigurePairs pairs={pairsToShow(home.agreements, PAIRS)} />
          <PositionChanges changes={latestChanges(home.movedStatements, CHANGES)} />
        </div>
      </ContentWithSidebar>
      {home.toReview && (
        <ReviewInvite toReview={home.toReview} viewer={viewerOf(contributor)} skip={skip} />
      )}
    </>
  )
}
