import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import { StatementSource } from '../../domain/use-cases/statement-stream'
import { SubjectSource } from '../../domain/use-cases/subject-stream'
import { createArgumentRepository } from '../database/argument-repository-supabase'
import { createPositionRepository } from '../database/position-repository-supabase'
import { createRelatedSubjectsRepository } from '../database/related-subjects-repository-supabase'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { createSubjectRepository } from '../database/subject-repository-supabase'
import { createThemeRepository } from '../database/theme-repository-supabase'

/**
 * What the projections hold of an aggregate, read through the existing
 * repositories: the commands import a stream from it on demand.
 */
export function createStatementSource(supabase: SupabaseClient<Database>): StatementSource {
  const statements = createStatementRepository(supabase)
  const argumentRepo = createArgumentRepository(supabase)
  return (statementId) =>
    Effect.flatMap(statements.findById(statementId), (statement) =>
      statement
        ? Effect.map(argumentRepo.findRefsByStatementId(statementId), (refs) => ({
            statement,
            argumentIds: refs.map((a) => a.id),
          }))
        : Effect.succeed(null),
    )
}

export function createSubjectSource(supabase: SupabaseClient<Database>): SubjectSource {
  const subjects = createSubjectRepository(supabase)
  const positions = createPositionRepository(supabase)
  const themes = createThemeRepository(supabase)
  const related = createRelatedSubjectsRepository(supabase)
  return (subjectId) =>
    Effect.flatMap(subjects.findById(subjectId), (subject) =>
      subject
        ? Effect.map(
            Effect.all([
              positions.findBySubjectId(subjectId),
              themes.findAssignmentsBySubjectId(subjectId),
              related.findRelated(subjectId),
            ]),
            ([subjectPositions, assignments, relatedSubjects]) => ({
              subject,
              positions: subjectPositions,
              themes: assignments.map((a) => ({ themeId: a.theme.id, isPrimary: a.isPrimary })),
              relatedSubjectIds: relatedSubjects.map((s) => s.id),
            }),
          )
        : Effect.succeed(null),
    )
}
