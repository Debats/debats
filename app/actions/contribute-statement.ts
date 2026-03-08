'use server'

import * as Sentry from '@sentry/nextjs'
import sharp from 'sharp'
import { Either } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import {
  contributeStatementUseCase,
  FieldErrors,
} from '../../domain/use-cases/contribute-statement'
import { createWikipediaValidator } from '../../infra/wikipedia/wikipedia-validator'
import { getAuthenticatedContributor } from './get-authenticated-contributor'
import { generateSlug } from '../../domain/entities/public-figure'

export type ActionResult =
  | { success: true; subjectSlug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function contributeStatementAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createSSRSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const publicFigureId = String(formData.get('publicFigureId') ?? '')
  const subjectId = String(formData.get('subjectId') ?? '')
  const positionId = String(formData.get('positionId') ?? '')

  const newPublicFigureName = String(formData.get('new_publicFigure_name') ?? '')
  const newSubjectTitle = String(formData.get('new_subject_title') ?? '')
  const newPositionTitle = String(formData.get('new_position_title') ?? '')

  // Validate photo is provided when creating a new personality
  const isCreatingNewFigure = !publicFigureId && !!newPublicFigureName
  const photoFile = formData.get('new_publicFigure_photo') as File | null
  if (isCreatingNewFigure && (!photoFile || photoFile.size === 0)) {
    return {
      success: false,
      fieldErrors: { 'newPublicFigure.photo': 'La photo de la personnalité est obligatoire.' },
    }
  }

  // Upload photo BEFORE entity creation (if new figure)
  if (isCreatingNewFigure && photoFile && photoFile.size > 0) {
    const slug = generateSlug(newPublicFigureName)
    const storagePath = `${slug}.jpg`
    const rawBuffer = Buffer.from(await photoFile.arrayBuffer())
    const resizedBuffer = await sharp(rawBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const admin = createAdminSupabaseClient()
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
  }

  const result = await contributeStatementUseCase({
    contributor,

    // If no existing ID provided but new fields are filled, it's a creation
    publicFigureId: publicFigureId || undefined,
    newPublicFigure: isCreatingNewFigure
      ? {
          name: newPublicFigureName,
          presentation: String(formData.get('new_publicFigure_presentation') ?? ''),
          wikipediaUrl: String(formData.get('new_publicFigure_wikipediaUrl') ?? ''),
          websiteUrl: String(formData.get('new_publicFigure_websiteUrl') ?? ''),
        }
      : undefined,

    subjectId: subjectId || undefined,
    newSubject:
      !subjectId && newSubjectTitle
        ? {
            title: newSubjectTitle,
            presentation: String(formData.get('new_subject_presentation') ?? ''),
            problem: String(formData.get('new_subject_problem') ?? ''),
          }
        : undefined,

    positionId: positionId || undefined,
    newPosition:
      !positionId && newPositionTitle
        ? {
            title: newPositionTitle,
            description: String(formData.get('new_position_description') ?? ''),
          }
        : undefined,

    sourceName: String(formData.get('sourceName') ?? ''),
    sourceUrl: String(formData.get('sourceUrl') ?? ''),
    quote: String(formData.get('quote') ?? ''),
    factDate: String(formData.get('factDate') ?? ''),

    subjectRepo: createSubjectRepository(supabase),
    positionRepo: createPositionRepository(supabase),
    statementRepo: createStatementRepository(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
    reputationRepo: createReputationRepository(createAdminSupabaseClient()),
    wikipediaValidator: createWikipediaValidator(),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true, subjectSlug: result.right.subjectSlug }
}
