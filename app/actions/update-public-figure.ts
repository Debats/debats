'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import {
  AvatarStorageError,
  moveFigureAvatar,
  removeFigureAvatar,
  uploadFigureAvatar,
} from '../../infra/storage/figure-avatar'
import { readUploadedImage } from './read-uploaded-image'
import { runLive, runLiveForm } from '../../infra/live-services'
import {
  validateUpdatePublicFigure,
  persistUpdatedPublicFigure,
  FieldErrors,
} from '../../domain/use-cases/update-public-figure'
import { NewCorrection } from '../../domain/use-cases/record-correction'
import { generateSlug } from '../../domain/entities/public-figure'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { editPublicFigureForm, EditPublicFigureFormData } from '../../lib/forms/public-figure-form'

export type ActionResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updatePublicFigureAction(
  figureId: string,
  formData: EditPublicFigureFormData,
  /** What the editor says of the figure's review; absent when nobody confirmed or flagged it */
  review?: NewCorrection,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const { photo: chosenPhoto, ...fields } = editPublicFigureForm.decode(formData)
  const useCaseParams = { contributor, figureId, ...fields, review }

  // Phase 1: Validate
  const validation = await runLiveForm(validateUpdatePublicFigure(useCaseParams), supabase)
  if (Either.isLeft(validation)) {
    const err = validation.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  const { existing } = validation.right
  const oldSlug = existing.slug
  const newSlug = generateSlug(fields.name)
  const slugChanged = newSlug !== oldSlug

  // Phase 2: Handle avatar
  if (chosenPhoto) {
    const photo = await readUploadedImage(chosenPhoto)
    if (Either.isLeft(photo)) {
      return { success: false, fieldErrors: { photo: photo.left } }
    }

    try {
      await uploadFigureAvatar(supabase, newSlug, photo.right)
    } catch (error) {
      if (error instanceof AvatarStorageError) {
        return { success: false, error: "L'upload de la photo a échoué. Veuillez réessayer." }
      }
      throw error
    }

    if (slugChanged) {
      await removeFigureAvatar(supabase, oldSlug)
    }
  } else if (slugChanged) {
    await moveFigureAvatar(supabase, oldSlug, newSlug)
  }

  // Phase 3: Persist
  const saved = await runLive(persistUpdatedPublicFigure(useCaseParams, validation.right), supabase)
  if (Either.isLeft(saved)) {
    return { success: false, error: saved.left }
  }

  return { success: true, slug: saved.right.slug }
}
