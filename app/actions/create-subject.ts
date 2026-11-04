'use server'

import { Either } from 'effect'
import { runLiveForm } from '../../infra/live-services'
import {
  createSubjectUseCase,
  FieldErrors,
  NewSubject,
} from '../../domain/use-cases/create-subject'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string; title: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function createSubjectAction(subject: NewSubject): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(createSubjectUseCase({ contributor, ...subject }))

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return { success: true, slug: result.right.slug, title: result.right.title }
}
