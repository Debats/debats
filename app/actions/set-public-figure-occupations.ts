'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLive } from '../../infra/live-services'
import { OccupationAssignmentInput } from '../../domain/read-models/occupations'
import { setPublicFigureOccupationsUseCase } from '../../domain/use-cases/set-public-figure-occupations'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

/** On success, the revision the next change must be rendered from */
export type SetOccupationsResult =
  | { success: true; revision: number }
  | { success: false; error: string }

export async function setPublicFigureOccupationsAction(
  publicFigureId: string,
  publicFigureSlug: string,
  assignments: OccupationAssignmentInput[],
  revision: number,
): Promise<SetOccupationsResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(
    setPublicFigureOccupationsUseCase({ contributor, publicFigureId, assignments, revision }),
  )

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath(`/p/${publicFigureSlug}`)
  return { success: true, revision: result.right }
}
