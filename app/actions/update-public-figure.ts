'use server'

import * as Sentry from '@sentry/nextjs'
import sharp from 'sharp'
import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
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
    const storagePath = `${newSlug}.jpg`
    const rawBuffer = Buffer.from(await photoFile.arrayBuffer())
    const resizedBuffer = await sharp(rawBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, resizedBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      Sentry.captureException(new Error(`Avatar upload failed: ${uploadError.message}`), {
        extra: { storagePath },
      })
      return {
        success: false,
        error: "L'upload de la photo a échoué. Veuillez réessayer.",
      }
    }
  } else if (slugChanged) {
    // No new photo but slug changed: copy old avatar to new path
    const { error: copyError } = await supabase.storage
      .from('avatars')
      .copy(`${oldSlug}.jpg`, `${newSlug}.jpg`)

    if (copyError) {
      Sentry.captureException(new Error(`Avatar copy failed: ${copyError.message}`), {
        extra: { from: `${oldSlug}.jpg`, to: `${newSlug}.jpg` },
      })
      // Non bloquant : on continue même si la copie échoue
    }
  }

  // Clean up old avatar if slug changed
  if (slugChanged) {
    await supabase.storage.from('avatars').remove([`${oldSlug}.jpg`])
  }

  // Phase 3: Persist
  const saved = await persistUpdatedPublicFigure(useCaseParams, existing)

  return { success: true, slug: saved.slug }
}
