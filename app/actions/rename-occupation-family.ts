'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLiveForm } from '../../infra/live-services'
import {
  FieldErrors,
  RenamedOccupationFamily,
  renameOccupationFamilyUseCase,
} from '../../domain/use-cases/rename-occupation-family'
import { FIGURES_HREF, OCCUPATIONS_HREF } from '../../domain/read-models/hrefs'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type RenameOccupationFamilyResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function renameOccupationFamilyAction(
  familyId: string,
  renamed: RenamedOccupationFamily,
): Promise<RenameOccupationFamilyResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(
    renameOccupationFamilyUseCase({ contributor, familyId, ...renamed }),
  )

  if (Either.isLeft(result)) {
    const err = result.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  // The family is named on the list of occupations and on the figures index
  revalidatePath(OCCUPATIONS_HREF)
  revalidatePath(FIGURES_HREF)
  return { success: true, slug: result.right.slug }
}
