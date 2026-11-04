'use server'

import { Either } from 'effect'
import { runLive } from '../../infra/live-services'
import { EditedSubject, updateSubjectUseCase } from '../../domain/use-cases/update-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true; slug: string } | { success: false; error: string }

export async function updateSubjectAction(
  subjectId: string,
  edited: EditedSubject,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(updateSubjectUseCase({ contributor, subjectId, ...edited }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true, slug: result.right.slug }
}
