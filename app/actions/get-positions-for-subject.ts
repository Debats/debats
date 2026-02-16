'use server'

import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'

export interface PositionOption {
  id: string
  title: string
}

export async function getPositionsForSubject(subjectId: string): Promise<PositionOption[]> {
  const supabase = await createSSRSupabaseClient()
  const repo = createPositionRepository(supabase)

  const positions = await Effect.runPromise(repo.findBySubjectId(subjectId))

  return positions.map((p) => ({ id: p.id, title: p.title }))
}
