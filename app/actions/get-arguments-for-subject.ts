'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'

export interface ArgumentOption {
  id: string
  title: string
  description: string
}

/** The arguments a contributor can tick for a statement on this subject */
export async function getArgumentsForSubject(subjectId: string): Promise<ArgumentOption[]> {
  if (!subjectId) return []

  const supabase = createAdminSupabaseClient()
  const argumentsOfSubject = await Effect.runPromise(
    createArgumentRepository(supabase).findBySubjectId(subjectId),
  )

  return argumentsOfSubject.map((a) => ({ id: a.id, title: a.title, description: a.description }))
}
