'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLiveForm } from '../../infra/live-services'
import {
  addOrganisationMembershipUseCase,
  FieldErrors,
} from '../../domain/use-cases/add-organisation-membership'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function addOrganisationMembershipAction(
  organisationId: string,
  organisationSlug: string,
  formData: FormData,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(
    addOrganisationMembershipUseCase({
      contributor,
      organisationId,
      publicFigureId: String(formData.get('publicFigureId') ?? ''),
      role: String(formData.get('role') ?? ''),
      startedOn: String(formData.get('startedOn') ?? ''),
      endedOn: String(formData.get('endedOn') ?? ''),
    }),
  )

  if (Either.isLeft(result)) {
    const err = result.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  revalidatePath(`/o/${organisationSlug}`)
  return { success: true }
}
