import { SupabaseClient } from '@supabase/supabase-js'
import { Effect, pipe } from 'effect'
import { Database } from '../../types/database.types'
import {
  AnalysesPage,
  analysesOf,
  MOVING_DEBATES,
  MovingDebate,
} from '../../domain/read-models/analyses-page'
import { Debate, movingDebates, recentSince } from '../../domain/read-models/home-debates'
import { publicFigureRef } from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'
import { SubjectRepository } from '../../domain/repositories/subject-repository'
import { familiesByFigure } from '../../domain/services/occupation-distribution'
import { createArgumentRepository } from '../database/argument-repository-supabase'
import { createOccupationFamilyRepository } from '../database/occupation-family-repository-supabase'
import { createOccupationRepository } from '../database/occupation-repository-supabase'
import { createSubjectRepository } from '../database/subject-repository-supabase'
import { loadFigureAgreements } from './figure-agreements'
import { loadHomeDebates, loadSiteFigures } from './home-debates'
import { loadMovedStatements } from './position-changes'
import { findAllJudgedPairs } from './position-judgements'
import { loadCurrentMembers, loadSiteStatements } from './site-statements'

type Client = SupabaseClient<Database>

/**
 * How many pairs of figures to read. The page shows each figure once, so the
 * few it shows are picked among many more: the first pairs all share the same
 * two or three most present figures.
 */
const PAIR_CANDIDATES = 40

const unbounded = { concurrency: 'unbounded' } as const

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
 * Everything the analyses of the whole site show, as one Effect the page runs
 * once: the debates and what is compared across the site read together, then
 * the faces of the subjects that move, and the domain folds the blocks out of
 * what was read. `now` is the instant the page renders at:
 * it says where « recent » starts, and which affiliations still run.
 */
export const loadAnalysesPage = (
  supabase: Client,
  now: Date,
): Effect.Effect<AnalysesPage, DatabaseError> => {
  const subjects = createSubjectRepository(supabase)
  const occupations = createOccupationRepository(supabase)
  return pipe(
    Effect.all(
      {
        figures: loadSiteFigures(supabase),
        debates: loadHomeDebates(supabase, recentSince(now)),
        agreements: loadFigureAgreements(supabase, PAIR_CANDIDATES),
        movedStatements: loadMovedStatements(supabase),
        judged: findAllJudgedPairs(supabase),
        statements: loadSiteStatements(supabase),
        members: loadCurrentMembers(supabase, now),
        assignments: occupations.findAllAssignments(),
        occupations: occupations.findAll(),
        families: createOccupationFamilyRepository(supabase).findAll(),
        arguments: createArgumentRepository(supabase).findSummaries(),
      },
      unbounded,
    ),
    Effect.flatMap(({ debates, assignments, occupations: held, ...read }) =>
      pipe(
        loadMovingDebates(subjects, movingDebates(debates, MOVING_DEBATES)),
        Effect.map((moving) =>
          analysesOf({
            ...read,
            debates,
            moving,
            familiesOf: familiesByFigure(assignments, held),
          }),
        ),
      ),
    ),
  )
}
