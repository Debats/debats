'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'
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
    argumentRepo: createArgumentRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath('/arguments')
  return { success: true, targetSlug: result.right.slug }
}
