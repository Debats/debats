'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLiveForm } from '../../infra/live-services'
import { createOccupationUseCase } from '../../domain/use-cases/create-occupation'
import { FieldErrors } from '../../domain/use-cases/types'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type CreateOccupationResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createOccupationAction(formData: FormData): Promise<CreateOccupationResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(
    createOccupationUseCase({
      contributor,
      name: String(formData.get('name') ?? ''),
      familyId: String(formData.get('familyId') ?? ''),
      description: String(formData.get('description') ?? ''),
    }),
  )

  if (Either.isLeft(result)) {
    const err = result.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  revalidatePath('/metiers')
  return { success: true, slug: result.right.slug }
}
