'use server'

import { Either } from 'effect'
import { runLive } from '../../infra/live-services'
import { updateSubjectUseCase } from '../../domain/use-cases/update-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { revisionOf } from './form-revision'

export type ActionResult = { success: true; slug: string } | { success: false; error: string }

export async function updateSubjectAction(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(
    updateSubjectUseCase({
      contributor,
      subjectId,
      title: String(formData.get('title') ?? ''),
      presentation: String(formData.get('presentation') ?? ''),
      problem: String(formData.get('problem') ?? ''),
      revision: revisionOf(formData),
    }),
  )

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true, slug: result.right.slug }
}
