import { SupabaseClient } from '@supabase/supabase-js'
import { Effect, pipe } from 'effect'
import { Database } from '../../types/database.types'
import {
  dailyDebate,
  Debate,
  leadingPositions,
  movingDebates,
  recentSince,
} from '../../domain/read-models/home-debates'
import {
  DAILY_FACES,
  DailySubject,
  HomePage,
  MOVING_DEBATES,
  MovingDebate,
} from '../../domain/read-models/home-page'
import { publicFigureRef } from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'
import { StatementRepository } from '../../domain/repositories/statement-repository'
import { SubjectRepository } from '../../domain/repositories/subject-repository'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { createSubjectRepository } from '../database/subject-repository-supabase'
import { loadFigureAgreements } from './figure-agreements'
import { loadHomeDebates, loadSiteFigures } from './home-debates'
import { getSubjectPositionsSummary } from './subject-positions-summary'

type Client = SupabaseClient<Database>

/** How many of the site's last statements the rail shows */
const LATEST_STATEMENTS = 4

/**
 * How many pairs of figures to read. The page shows each figure once, so the
 * few it shows are picked among many more: the first pairs all share the same
 * two or three most present figures.
 */
const PAIR_CANDIDATES = 40

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
 * The moving subjects with the first faces of who spoke on each: the public
 * figures the subject card already shows, read for all of them at once.
 */
const loadMovingDebates = (
  subjects: SubjectRepository,
  debates: Debate[],
): Effect.Effect<MovingDebate[], DatabaseError> =>
  pipe(
    subjects.findSummariesByIds(debates.map((debate) => debate.id)),
    Effect.map((summaries) =>
      debates.map((debate) => ({
        debate,
        faces: (summaries.find((summary) => summary.id === debate.id)?.figures ?? []).map(
          publicFigureRef,
        ),
      })),
    ),
  )

/**
 * Everything the home page shows, as one Effect the page runs once: the
 * figures, the debates and the last statements together, then what depends on
 * those debates — the detail of the subject the day picked, the faces of the
 * subjects that move. `now` is the instant the page renders at: it names the
 * day and where « recent » starts.
 */
export const loadHomePage = (
  supabase: Client,
  now: Date,
): Effect.Effect<HomePage, DatabaseError> => {
  const statements = createStatementRepository(supabase)
  const subjects = createSubjectRepository(supabase)
  return pipe(
    Effect.all(
      {
        figures: loadSiteFigures(supabase),
        debates: loadHomeDebates(supabase, recentSince(now)),
        feed: statements.findFeed({}, { limit: LATEST_STATEMENTS, offset: 0 }),
        agreements: loadFigureAgreements(supabase, PAIR_CANDIDATES),
      },
      unbounded,
    ),
    Effect.flatMap(({ figures, debates, feed, agreements }) =>
      pipe(
        Effect.all(
          {
            daily: loadDailySubject(supabase, statements, dailyDebate(debates, now)),
            moving: loadMovingDebates(subjects, movingDebates(debates, MOVING_DEBATES)),
          },
          unbounded,
        ),
        Effect.map(({ daily, moving }) => ({
          figures,
          debates,
          daily,
          moving,
          agreements,
          latest: feed.entries,
        })),
      ),
    ),
  )
}
