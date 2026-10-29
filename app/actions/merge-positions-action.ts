'use server'

import { redirect } from 'next/navigation'
import { Either } from 'effect'
import { runLive } from '../../infra/live-services'
import { mergePositionsUseCase } from '../../domain/use-cases/merge-positions'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import type { ActionResult } from './validate-draft-action'

export async function mergePositionsAction(
  sourcePositionId: string,
  targetPositionId: string,
  subjectSlug: string,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(
    mergePositionsUseCase({ sourcePositionId, targetPositionId, contributor }),
  )

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  redirect(`/s/${subjectSlug}/position/${targetPositionId}`)
}
