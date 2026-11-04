'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { runLiveForm } from '../../infra/live-services'
import {
  renameArgumentUseCase,
  FieldErrors,
  RenamedArgument,
} from '../../domain/use-cases/rename-argument'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult =
  | { success: true; slug: string }
  | { success: false; error: string; fieldErrors?: undefined }
  | { success: false; error?: undefined; fieldErrors: FieldErrors }

export async function renameArgumentAction(
  argumentId: string,
  renamed: RenamedArgument,
): Promise<ActionResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLiveForm(renameArgumentUseCase({ contributor, argumentId, ...renamed }))

  if (Either.isLeft(result)) {
    const err = result.left
    return typeof err === 'string'
      ? { success: false, error: err }
      : { success: false, fieldErrors: err }
  }

  revalidatePath('/arguments')
  return { success: true, slug: result.right.slug }
}
