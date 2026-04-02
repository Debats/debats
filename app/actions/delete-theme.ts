'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { deleteThemeUseCase } from '../../domain/use-cases/delete-theme'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteThemeResult = { success: true } | { success: false; error: string }

export async function deleteThemeAction(themeId: string): Promise<DeleteThemeResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await deleteThemeUseCase({
    contributor,
    themeId,
    themeRepo: createThemeRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
