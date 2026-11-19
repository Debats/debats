import { Effect, pipe } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import {
  CarouselSlide,
  subjectCarousel,
  toCarouselStatement,
} from '../../domain/read-models/subject-carousel'
import {
  familiesByFigure,
  familyDistribution,
  familyPositionMatrix,
} from '../../domain/services/occupation-distribution'
import { createOccupationFamilyRepository } from '../database/occupation-family-repository-supabase'
import { createOccupationRepository } from '../database/occupation-repository-supabase'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { compatibilityOf } from '../../domain/read-models/position-judgements'
import { findJudgedPairs } from './position-judgements'
import { figureEntries } from './subject-family-distribution'

/** Positions the comparisons by family keep apart: with the rest folded into one, as many as the slides have shades */
const FAMILY_POSITIONS = 4

/**
 * The slides a subject offers to be shared: its statements with their
 * authors, the occupations of the public figures among them, folded by the
 * domain.
 */
export function getSubjectCarousel(
  supabase: SupabaseClient,
  subjectId: string,
): Effect.Effect<CarouselSlide[], DatabaseError> {
  const occupationRepo = createOccupationRepository(supabase)
  const familyRepo = createOccupationFamilyRepository(supabase)

  return pipe(
    createStatementRepository(supabase).findBySubjectWithAuthors(subjectId),
    Effect.flatMap((statements) => {
      const entries = figureEntries(statements)
      return pipe(
        Effect.all([
          occupationRepo.findAssignmentsByPublicFigureIds(
            Array.from(new Set(entries.map((entry) => entry.authorId))),
          ),
          occupationRepo.findAll(),
          familyRepo.findAll(),
          // Two positions judged compatible are held together: taking the second is no change
          findJudgedPairs(supabase, [subjectId]),
        ]),
        Effect.map(([assignments, occupations, families, judged]) =>
          subjectCarousel(
            statements.map(toCarouselStatement),
            {
              matrix: familyPositionMatrix(
                familyDistribution(entries, assignments, occupations, families),
                FAMILY_POSITIONS,
              ),
              byFigure: familiesByFigure(assignments, occupations),
            },
            compatibilityOf(judged),
          ),
        ),
      )
    }),
  )
}
