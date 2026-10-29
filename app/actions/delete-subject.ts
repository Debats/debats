'use server'

import { Either } from 'effect'
import { runLive } from '../../infra/live-services'
import { deleteSubjectUseCase } from '../../domain/use-cases/delete-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true } | { success: false; error: string }

export async function deleteSubjectAction(subjectId: string): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(deleteSubjectUseCase({ contributor, subjectId }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
