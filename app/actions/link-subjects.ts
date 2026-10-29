'use server'

import { Either } from 'effect'
import { runLive } from '../../infra/live-services'
import { linkSubjectsUseCase } from '../../domain/use-cases/link-subjects'
import { unlinkSubjectsUseCase } from '../../domain/use-cases/unlink-subjects'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type LinkResult = { success: true } | { success: false; error: string }

export async function linkSubjectsAction(
  subjectId1: string,
  subjectId2: string,
): Promise<LinkResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(linkSubjectsUseCase({ contributor, subjectId1, subjectId2 }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}

export async function unlinkSubjectsAction(
  subjectId1: string,
  subjectId2: string,
): Promise<LinkResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(unlinkSubjectsUseCase({ contributor, subjectId1, subjectId2 }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
