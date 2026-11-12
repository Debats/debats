import { SupabaseClient } from '@supabase/supabase-js'
import { Effect, pipe } from 'effect'
import { Database } from '../../types/database.types'
import {
  dailyDebate,
  Debate,
  leadingPositions,
  recentSince,
} from '../../domain/read-models/home-debates'
import { DAILY_FACES, DailySubject, HomePage } from '../../domain/read-models/home-page'
import { DatabaseError } from '../../domain/repositories/errors'
import { StatementRepository } from '../../domain/repositories/statement-repository'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { loadHomeDebates, loadSiteFigures } from './home-debates'
import { getSubjectPositionsSummary } from './subject-positions-summary'

type Client = SupabaseClient<Database>

/** How many of the site's last statements the rail shows */
const LATEST_STATEMENTS = 4

const unbounded = { concurrency: 'unbounded' } as const

/**
 * The subject of the day in detail: the faces behind each position, and the
 * last words said for its two leading ones. A leading position that only
 * holds votes has nothing to quote, and is simply not quoted.
 */
const loadDailySubject = (
  supabase: Client,
  statements: StatementRepository,
  debate: Debate | null,
): Effect.Effect<DailySubject | null, DatabaseError> =>
  debate === null
    ? Effect.succeed(null)
    : pipe(
        Effect.all(
          {
            positions: getSubjectPositionsSummary(supabase, debate.id, {
              authorsLimit: DAILY_FACES,
            }),
            quotes: Effect.all(
              leadingPositions(debate).map((position) =>
                statements.findLatestQuotedByPositionId(position.id),
              ),
              unbounded,
            ),
          },
          unbounded,
        ),
        Effect.map(({ positions, quotes }) => ({
          debate,
          positions,
          quotes: quotes.filter((quote) => quote !== null),
        })),
      )

/**
 * Everything the home page shows, as one Effect the page runs once: the
 * figures, the debates and the last statements together, then the detail of
 * the subject the day picked among those debates. `now` is the instant the
 * page renders at: it names the day and where « recent » starts.
 */
export const loadHomePage = (
  supabase: Client,
  now: Date,
): Effect.Effect<HomePage, DatabaseError> => {
  const statements = createStatementRepository(supabase)
  return pipe(
    Effect.all(
      {
        figures: loadSiteFigures(supabase),
        debates: loadHomeDebates(supabase, recentSince(now)),
        feed: statements.findFeed({}, { limit: LATEST_STATEMENTS, offset: 0 }),
      },
      unbounded,
    ),
    Effect.flatMap(({ figures, debates, feed }) =>
      pipe(
        loadDailySubject(supabase, statements, dailyDebate(debates, now)),
        Effect.map((daily) => ({ figures, debates, daily, latest: feed.entries })),
      ),
    ),
  )
}
