'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { AvatarStorageError, uploadFigureAvatar } from '../../infra/storage/figure-avatar'
import { readUploadedImage } from './read-uploaded-image'
import { runLive, runLiveForm } from '../../infra/live-services'
import {
  validateCreatePublicFigure,
  persistPublicFigure,
  FieldErrors,
} from '../../domain/use-cases/create-public-figure'
import { generateSlug } from '../../domain/entities/public-figure'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string; name: string; id: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createPublicFigureAction(formData: FormData): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const name = String(formData.get('name') ?? '')

  const photoFile = formData.get('photo') as File | null
  if (!photoFile || photoFile.size === 0) {
    return {
      success: false,
      fieldErrors: { photo: 'La photo de la personnalité est obligatoire.' },
    }
  }

  const photo = await readUploadedImage(photoFile)
  if (Either.isLeft(photo)) {
    return { success: false, fieldErrors: { photo: photo.left } }
  }

  const notorietySources = formData
    .getAll('notorietySources')
    .map((v) => String(v))
    .filter((v) => v.length > 0)

  const useCaseParams = {
    contributor,
    name,
    presentation: String(formData.get('presentation') ?? ''),
    wikipediaUrl: String(formData.get('wikipediaUrl') ?? ''),
    websiteUrl: String(formData.get('websiteUrl') ?? ''),
    notorietySources,
  }

  // Phase 1: Validate — nothing persisted yet
  const validation = await runLiveForm(validateCreatePublicFigure(useCaseParams), supabase)
  if (Either.isLeft(validation)) {
    const err = validation.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  // Phase 2: Upload photo — entity not yet created
  try {
    await uploadFigureAvatar(supabase, generateSlug(name), photo.right)
  } catch (error) {
    if (error instanceof AvatarStorageError) {
      return { success: false, error: "L'upload de la photo a échoué. Veuillez réessayer." }
    }
    throw error
  }

  // Phase 3: Persist entity + reputation — photo already uploaded
  const created = await runLive(persistPublicFigure(useCaseParams, validation.right), supabase)
  if (Either.isLeft(created)) {
    return { success: false, error: created.left }
  }

  return {
    success: true,
    slug: created.right.slug,
    name: created.right.name,
    id: created.right.id,
  }
}
