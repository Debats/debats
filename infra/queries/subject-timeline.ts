import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import { subjectTimeline, TimelineYear } from '../../domain/services/subject-timeline'
import { createStatementRepository } from '../database/statement-repository-supabase'

/** The statements of a subject in the order they were stated, folded by the domain service */
export function getSubjectTimeline(
  supabase: SupabaseClient,
  subjectId: string,
): Effect.Effect<TimelineYear[], DatabaseError> {
  return Effect.map(
    createStatementRepository(supabase).findBySubjectWithAuthors(subjectId),
    subjectTimeline,
  )
}
