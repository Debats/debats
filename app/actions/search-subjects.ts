'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'

export interface SubjectSearchResult {
  id: string
  title: string
  slug: string
}

export async function searchSubjects(query: string): Promise<SubjectSearchResult[]> {
  if (query.length < 2) return []

  const supabase = createAdminSupabaseClient()
  const repo = createSubjectRepository(supabase)

  const subjects = await Effect.runPromise(repo.findAll())

  const words = query.toLowerCase().split(/\s+/).filter(Boolean)

  return subjects
    .filter((s) => {
      const title = s.title.toLowerCase()
      return words.every((word) => title.includes(word))
    })
    .slice(0, 10)
    .map((s) => ({ id: s.id, title: s.title, slug: s.slug }))
}
