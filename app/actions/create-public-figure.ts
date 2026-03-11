'use server'

import * as Sentry from '@sentry/nextjs'
import sharp from 'sharp'
import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import {
  validateCreatePublicFigure,
  persistPublicFigure,
  FieldErrors,
} from '../../domain/use-cases/create-public-figure'
import { createWikipediaValidator } from '../../infra/wikipedia/wikipedia-validator'
import { generateSlug } from '../../domain/entities/public-figure'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string; name: string; id: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createPublicFigureAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const admin = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const name = String(formData.get('name') ?? '')

  const photoFile = formData.get('photo') as File | null
  if (!photoFile || photoFile.size === 0) {
    return {
      success: false,
      fieldErrors: { photo: 'La photo de la personnalité est obligatoire.' },
    }
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
    publicFigureRepo: createPublicFigureRepository(supabase),
    reputationRepo: createReputationRepository(admin),
    wikipediaValidator: createWikipediaValidator(),
  }

  // Phase 1: Validate — nothing persisted yet
  const validation = await validateCreatePublicFigure(useCaseParams)
  if (Either.isLeft(validation)) {
    const err = validation.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  // Phase 2: Upload photo — entity not yet created
  const storagePath = `${generateSlug(name)}.jpg`
  const rawBuffer = Buffer.from(await photoFile.arrayBuffer())
  const resizedBuffer = await sharp(rawBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  const { error: uploadError } = await admin.storage
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

  // Phase 3: Persist entity + reputation — photo already uploaded
  const createdFigure = await persistPublicFigure(useCaseParams)

  return {
    success: true,
    slug: createdFigure.slug,
    name: createdFigure.name,
    id: createdFigure.id,
  }
}
