'use server'

import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'

export interface SubjectSearchResult {
  id: string
  title: string
}

export async function searchSubjects(query: string): Promise<SubjectSearchResult[]> {
  if (query.length < 2) return []

  const supabase = await createSSRSupabaseClient()
  const repo = createSubjectRepository(supabase)

  const subjects = await Effect.runPromise(repo.findAll())

  return subjects
    .filter((s) => s.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10)
    .map((s) => ({ id: s.id, title: s.title }))
}
