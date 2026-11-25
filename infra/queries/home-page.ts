import { SupabaseClient } from '@supabase/supabase-js'
import { Effect, pipe } from 'effect'
import { Database } from '../../types/database.types'
import {
  dailyDebate,
  Debate,
  leadingPositions,
  mostSpokenDebates,
  recentSince,
} from '../../domain/read-models/home-debates'
import {
  DailySubject,
  HOME_LATEST_STATEMENTS,
  HOME_SHELVES,
  HomePage,
} from '../../domain/read-models/home-page'
import { orderByEngagement } from '../../domain/read-models/organisation-summary'
import { DatabaseError } from '../../domain/repositories/errors'
import { StatementRepository } from '../../domain/repositories/statement-repository'
import { createOrganisationRepository } from '../database/organisation-repository-supabase'
import { createPublicFigureRepository } from '../database/public-figure-repository-supabase'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { loadHomeDebates, loadSiteFigures } from './home-debates'
import { loadLatestJointDeclarations } from './joint-declarations'

type Client = SupabaseClient<Database>

const unbounded = { concurrency: 'unbounded' } as const

/**
 * The subject of the day in detail: the last words said for its two leading
 * positions. A leading position that only holds votes has nothing to quote,
 * and is simply not quoted.
 */
const loadDailySubject = (
  statements: StatementRepository,
  debate: Debate | null,
): Effect.Effect<DailySubject | null, DatabaseError> =>
  debate === null
    ? Effect.succeed(null)
    : pipe(
        Effect.all(
          leadingPositions(debate).map((position) =>
            statements.findLatestQuotedByPositionId(position.id),
          ),
          unbounded,
        ),
        Effect.map((quotes) => ({ debate, quotes: quotes.filter((quote) => quote !== null) })),
      )

/**
 * Everything the home page shows, as one Effect the page runs once: what the
 * four shelves are cut from and the last statements together, then the detail
 * of the subject the day picked. `now` is the instant the page renders at:
 * it names the day.
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
        feed: statements.findFeed({}, 'stated', { limit: HOME_LATEST_STATEMENTS, offset: 0 }),
        publicFigures: createPublicFigureRepository(supabase).findMostDocumented(
          HOME_SHELVES.publicFigures,
        ),
        organisations: createOrganisationRepository(supabase).findSummaries(),
        declarations: loadLatestJointDeclarations(supabase, HOME_SHELVES.declarations),
      },
      unbounded,
    ),
    Effect.flatMap(({ figures, debates, feed, publicFigures, organisations, declarations }) => {
      const picked = dailyDebate(debates, now)
      return pipe(
        loadDailySubject(statements, picked),
        Effect.map((daily) => ({
          daily,
          latest: feed.entries,
          subjects: {
            shown: mostSpokenDebates(debates, HOME_SHELVES.subjects, picked),
            total: figures.subjects,
          },
          publicFigures: { shown: publicFigures, total: figures.publicFigures },
          organisations: {
            shown: orderByEngagement(organisations).slice(0, HOME_SHELVES.organisations),
            total: organisations.length,
          },
          declarations,
        })),
      )
    }),
  )
}
