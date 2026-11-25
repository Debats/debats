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
  mostSpokenFigures,
} from '../../domain/read-models/home-page'
import { orderByEngagement } from '../../domain/read-models/organisation-summary'
import {
  spokenSince,
  subjectsByFigure,
  voicesBySubject,
} from '../../domain/read-models/spoken-lately'
import { DatabaseError } from '../../domain/repositories/errors'
import { StatementRepository } from '../../domain/repositories/statement-repository'
import { createOrganisationRepository } from '../database/organisation-repository-supabase'
import { createPublicFigureRepository } from '../database/public-figure-repository-supabase'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { loadHomeDebates, loadSiteFigures } from './home-debates'
import { loadLatestJointDeclarations } from './joint-declarations'
import { loadSpokenSince } from './spoken-lately'

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
 * of the subject the day picked and the public figures who spoke lately.
 * `now` is the instant the page renders at: it names the day.
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
        spoken: loadSpokenSince(supabase, spokenSince(now)),
        feed: statements.findFeed({}, 'stated', 'signatures-and-days', {
          limit: HOME_LATEST_STATEMENTS,
          offset: 0,
        }),
        organisations: createOrganisationRepository(supabase).findSummaries(),
        declarations: loadLatestJointDeclarations(supabase, HOME_SHELVES.declarations),
      },
      unbounded,
    ),
    Effect.flatMap(({ figures, debates, spoken, feed, organisations, declarations }) => {
      const picked = dailyDebate(debates, now)
      const subjectsOfLate = subjectsByFigure(spoken)
      return pipe(
        Effect.all(
          [
            loadDailySubject(statements, picked),
            // Everyone who spoke lately: the shelf ranks them, then settles the ties on what the site holds of each
            createPublicFigureRepository(supabase).findSummariesByIds(
              Array.from(subjectsOfLate.keys()),
            ),
          ],
          unbounded,
        ),
        Effect.map(([daily, spokeLately]) => ({
          daily,
          latest: feed.entries,
          subjects: {
            shown: mostSpokenDebates(
              debates,
              voicesBySubject(spoken),
              HOME_SHELVES.subjects,
              picked,
            ),
            total: figures.subjects,
          },
          publicFigures: {
            shown: mostSpokenFigures(spokeLately, subjectsOfLate, HOME_SHELVES.publicFigures),
            total: figures.publicFigures,
          },
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
