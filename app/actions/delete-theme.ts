'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createThemeSource } from '../../infra/events/sources'
import { deleteThemeUseCase } from '../../domain/use-cases/delete-theme'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type DeleteThemeResult = { success: true } | { success: false; error: string }

export async function deleteThemeAction(themeId: string): Promise<DeleteThemeResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await deleteThemeUseCase({
    contributor,
    themeId,
    runUnitOfWork,
    themeSource: createThemeSource(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
