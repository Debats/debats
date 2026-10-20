'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createWikipediaValidator } from '../../infra/wikipedia/wikipedia-validator'
import { LogoStorageError, uploadOrganisationLogo } from '../../infra/storage/organisation-logo'
import {
  validateCreateOrganisation,
  persistOrganisation,
  FieldErrors,
} from '../../domain/use-cases/create-organisation'
import { generateOrganisationSlug } from '../../domain/entities/organisation'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { readOrganisationFields } from './organisation-fields'
import { readUploadedImage } from './read-uploaded-image'

export type ActionResult =
  | { success: true; slug: string; name: string; id: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createOrganisationAction(formData: FormData): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()
  const fields = readOrganisationFields(formData)

  const params = {
    contributor,
    ...fields,
    runUnitOfWork,
    organisationRepo: createOrganisationRepository(supabase),
    wikipediaValidator: createWikipediaValidator(),
  }

  // Phase 1: validate, nothing persisted yet
  const validation = await validateCreateOrganisation(params)
  if (Either.isLeft(validation)) {
    const err = validation.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  // Phase 2: optional logo upload, entity not yet created
  const logo = formData.get('logo')
  if (logo instanceof File && logo.size > 0) {
    const image = await readUploadedImage(logo)
    if (Either.isLeft(image)) {
      return { success: false, fieldErrors: { logo: image.left } }
    }

    try {
      await uploadOrganisationLogo(supabase, generateOrganisationSlug(fields.name), image.right)
    } catch (error) {
      if (error instanceof LogoStorageError) {
        return { success: false, error: "L'upload du logo a échoué. Veuillez réessayer." }
      }
      throw error
    }
  }

  // Phase 3: persist entity and reputation
  const created = await persistOrganisation(params, validation.right.organisationType)

  return { success: true, slug: created.slug, name: created.name, id: created.id }
}
