'use server'

import { Either } from 'effect'
import { runLive } from '../../infra/live-services'
import { deleteThemeUseCase } from '../../domain/use-cases/delete-theme'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteThemeResult = { success: true } | { success: false; error: string }

export async function deleteThemeAction(themeId: string): Promise<DeleteThemeResult> {
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(deleteThemeUseCase({ contributor, themeId }))

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
