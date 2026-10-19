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
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createPublicFigureSource } from '../../infra/events/sources'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import {
  validateUpdatePublicFigure,
  persistUpdatedPublicFigure,
  FieldErrors,
} from '../../domain/use-cases/update-public-figure'
import { createWikipediaValidator } from '../../infra/wikipedia/wikipedia-validator'
import { generateSlug } from '../../domain/entities/public-figure'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function updatePublicFigureAction(
  figureId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const name = String(formData.get('name') ?? '')

  const notorietySources = formData
    .getAll('notorietySources')
    .map((v) => String(v))
    .filter((v) => v.length > 0)

  const useCaseParams = {
    contributor,
    figureId,
    name,
    presentation: String(formData.get('presentation') ?? ''),
    wikipediaUrl: String(formData.get('wikipediaUrl') ?? ''),
    websiteUrl: String(formData.get('websiteUrl') ?? ''),
    notorietySources,
    runUnitOfWork,
    publicFigureSource: createPublicFigureSource(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
    reputationRepo: createReputationRepository(supabase),
    wikipediaValidator: createWikipediaValidator(),
  }

  // Phase 1: Validate
  const validation = await validateUpdatePublicFigure(useCaseParams)
  if (Either.isLeft(validation)) {
    const err = validation.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  const existing = validation.right
  const oldSlug = existing.slug
  const newSlug = generateSlug(name)
  const slugChanged = newSlug !== oldSlug

  // Phase 2: Handle avatar
  const photoFile = formData.get('photo') as File | null
  const hasNewPhoto = photoFile && photoFile.size > 0

  if (hasNewPhoto) {
    const photo = await readUploadedImage(photoFile)
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
  const saved = await persistUpdatedPublicFigure(useCaseParams, existing)
  if (Either.isLeft(saved)) {
    return { success: false, error: saved.left }
  }

  return { success: true, slug: saved.right.slug }
}
