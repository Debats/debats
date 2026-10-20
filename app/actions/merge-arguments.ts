'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createArgumentSource, createStatementSource } from '../../infra/events/sources'
import { mergeArgumentsUseCase } from '../../domain/use-cases/merge-arguments'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true; targetSlug: string } | { success: false; error: string }

export async function mergeArgumentsAction(
  sourceArgumentId: string,
  targetArgumentId: string,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await mergeArgumentsUseCase({
    contributor,
    sourceArgumentId,
    targetArgumentId,
    runUnitOfWork,
    argumentSource: createArgumentSource(supabase),
    statementSource: createStatementSource(supabase),
    statementRepo: createStatementRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath('/arguments')
  return { success: true, targetSlug: result.right.slug }
}
