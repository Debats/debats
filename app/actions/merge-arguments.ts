'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLive } from '../../infra/live-services'
import { mergeArgumentsUseCase } from '../../domain/use-cases/merge-arguments'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true; targetSlug: string } | { success: false; error: string }

export async function mergeArgumentsAction(
  sourceArgumentId: string,
  targetArgumentId: string,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(
    mergeArgumentsUseCase({ contributor, sourceArgumentId, targetArgumentId }),
  )

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath('/arguments')
  return { success: true, targetSlug: result.right.slug }
}
