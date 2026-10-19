'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createStatementSource, createSubjectSource } from '../../infra/events/sources'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { deleteSubjectUseCase } from '../../domain/use-cases/delete-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true } | { success: false; error: string }

export async function deleteSubjectAction(subjectId: string): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await deleteSubjectUseCase({
    contributor,
    subjectId,
    runUnitOfWork,
    subjectSource: createSubjectSource(supabase),
    statementSource: createStatementSource(supabase),
    subjectRepo: createSubjectRepository(supabase),
    statementRepo: createStatementRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
