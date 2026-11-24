'use server'

import { revalidatePath } from 'next/cache'
import { Either } from 'effect'
import { subjectHref } from '../../domain/read-models/hrefs'
import { subjectCompatibilityHref } from '../../domain/read-models/position-judgements'
import { judgePositionsUseCase, PositionsVerdict } from '../../domain/use-cases/judge-positions'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type JudgePositionsResult = { success: true } | { success: false; error: string }

/** Says two positions of a subject are compatible, or not; the pages that read it are rendered again */
export async function judgePositionsAction(
  verdict: PositionsVerdict,
  subjectSlug: string,
): Promise<JudgePositionsResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(judgePositionsUseCase({ ...verdict, contributor }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath(subjectCompatibilityHref(subjectSlug))
  revalidatePath(subjectHref(subjectSlug))
  return { success: true }
}
