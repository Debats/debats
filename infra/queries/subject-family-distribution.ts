import { Effect, pipe } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import { StatementWithAuthor } from '../../domain/repositories/statement-repository'
import {
  familyDistribution,
  FamilyDistribution,
} from '../../domain/services/occupation-distribution'
import { createOccupationFamilyRepository } from '../database/occupation-family-repository-supabase'
import { createOccupationRepository } from '../database/occupation-repository-supabase'
import { createStatementRepository } from '../database/statement-repository-supabase'

/** Only public figures have occupations; organisations are left out */
const figureEntries = (statements: StatementWithAuthor[]) =>
  statements
    .filter(({ author }) => author.kind === 'public_figure')
    .map(({ position, author }) => ({
      position: { id: position.id, title: position.title },
      authorId: author.id,
    }))

/**
 * Who speaks on a subject, by family of occupation: the statements of public
 * figures, their occupations, folded by the domain service.
 */
export function getSubjectFamilyDistribution(
  supabase: SupabaseClient,
  subjectId: string,
): Effect.Effect<FamilyDistribution, DatabaseError> {
  const occupationRepo = createOccupationRepository(supabase)
  const familyRepo = createOccupationFamilyRepository(supabase)

  return pipe(
    createStatementRepository(supabase).findBySubjectWithAuthors(subjectId),
    Effect.map(figureEntries),
    Effect.flatMap((entries) =>
      pipe(
        Effect.all([
          occupationRepo.findAssignmentsByPublicFigureIds(
            Array.from(new Set(entries.map((e) => e.authorId))),
          ),
          occupationRepo.findAll(),
          familyRepo.findAll(),
        ]),
        Effect.map(([assignments, occupations, families]) =>
          familyDistribution(entries, assignments, occupations, families),
        ),
      ),
    ),
  )
}
