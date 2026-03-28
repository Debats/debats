'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'

export interface PositionOption {
  id: string
  title: string
}

export async function getPositionsForSubject(subjectId: string): Promise<PositionOption[]> {
  const supabase = createAdminSupabaseClient()
  const repo = createPositionRepository(supabase)

  const positions = await Effect.runPromise(repo.findBySubjectId(subjectId))

  return positions.map((p) => ({ id: p.id, title: p.title }))
}
