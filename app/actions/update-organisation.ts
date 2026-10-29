'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runLive, runLiveForm } from '../../infra/live-services'
import {
  LogoStorageError,
  moveOrganisationLogo,
  removeOrganisationLogo,
  uploadOrganisationLogo,
} from '../../infra/storage/organisation-logo'
import {
  validateUpdateOrganisation,
  persistUpdatedOrganisation,
  FieldErrors,
} from '../../domain/use-cases/update-organisation'
import { generateOrganisationSlug } from '../../domain/entities/organisation'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { revisionOf } from './form-revision'
import { readOrganisationFields } from './organisation-fields'
import { readUploadedImage } from './read-uploaded-image'

export type ActionResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updateOrganisationAction(
  organisationId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()
  const fields = readOrganisationFields(formData)

  const params = { contributor, organisationId, ...fields, revision: revisionOf(formData) }

  // Phase 1: validate
  const validation = await runLiveForm(validateUpdateOrganisation(params), supabase)
  if (Either.isLeft(validation)) {
    const err = validation.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  // Phase 2: logo, following a possible slug change
  const oldSlug = validation.right.existing.slug
  const newSlug = generateOrganisationSlug(fields.name)
  const logo = formData.get('logo')

  if (logo instanceof File && logo.size > 0) {
    const image = await readUploadedImage(logo)
    if (Either.isLeft(image)) {
      return { success: false, fieldErrors: { logo: image.left } }
    }

    try {
      await uploadOrganisationLogo(supabase, newSlug, image.right)
    } catch (error) {
      if (error instanceof LogoStorageError) {
        return { success: false, error: "L'upload du logo a échoué. Veuillez réessayer." }
      }
      throw error
    }
    if (newSlug !== oldSlug) {
      await removeOrganisationLogo(supabase, oldSlug)
    }
  } else if (newSlug !== oldSlug) {
    await moveOrganisationLogo(supabase, oldSlug, newSlug)
  }

  // Phase 3: persist
  const saved = await runLive(persistUpdatedOrganisation(params, validation.right), supabase)
  if (Either.isLeft(saved)) {
    return { success: false, error: saved.left }
  }

  return { success: true, slug: saved.right.slug }
}
