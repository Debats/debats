'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createRelatedSubjectsRepository } from '../../infra/database/related-subjects-repository-supabase'
import { linkSubjectsUseCase } from '../../domain/use-cases/link-subjects'
import { unlinkSubjectsUseCase } from '../../domain/use-cases/unlink-subjects'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type LinkResult = { success: true } | { success: false; error: string }

export async function linkSubjectsAction(
  subjectId1: string,
  subjectId2: string,
): Promise<LinkResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await linkSubjectsUseCase({
    contributor,
    subjectId1,
    subjectId2,
    subjectRepo: createSubjectRepository(supabase),
    relatedRepo: createRelatedSubjectsRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}

export async function unlinkSubjectsAction(
  subjectId1: string,
  subjectId2: string,
): Promise<LinkResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await unlinkSubjectsUseCase({
    contributor,
    subjectId1,
    subjectId2,
    relatedRepo: createRelatedSubjectsRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
