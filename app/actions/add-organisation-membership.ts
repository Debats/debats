'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createPublicFigureSource } from '../../infra/events/sources'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
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
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await addOrganisationMembershipUseCase({
    contributor,
    organisationId,
    publicFigureId: String(formData.get('publicFigureId') ?? ''),
    role: String(formData.get('role') ?? ''),
    startedOn: String(formData.get('startedOn') ?? ''),
    endedOn: String(formData.get('endedOn') ?? ''),
    runUnitOfWork,
    publicFigureSource: createPublicFigureSource(supabase),
    organisationRepo: createOrganisationRepository(supabase),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  revalidatePath(`/o/${organisationSlug}`)
  return { success: true }
}
