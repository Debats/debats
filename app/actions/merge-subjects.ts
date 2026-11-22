'use server'

import { redirect } from 'next/navigation'
import { Either } from 'effect'
import { subjectHref } from '../../domain/read-models/hrefs'
import { mergeSubjectsUseCase, SubjectsMerge } from '../../domain/use-cases/merge-subjects'
import { runLive } from '../../infra/live-services'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type MergeSubjectsResult = { success: false; error: string }

/** Merges a subject into another, then leads the contributor to the subject that remains */
export async function mergeSubjectsAction(merge: SubjectsMerge): Promise<MergeSubjectsResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(mergeSubjectsUseCase({ ...merge, contributor }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  redirect(subjectHref(result.right.slug))
}
