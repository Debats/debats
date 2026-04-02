'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { createThemeUseCase } from '../../domain/use-cases/create-theme'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type CreateThemeResult =
  | { success: true; id: string; name: string; slug: string }
  | { success: false; error: string }
  | { success: false; fieldErrors: Record<string, string> }

export async function createThemeAction(formData: FormData): Promise<CreateThemeResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await createThemeUseCase({
    contributor,
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    themeRepo: createThemeRepository(supabase),
  })

  if (Either.isLeft(result)) {
    const err = result.left
    if (typeof err === 'string') {
      return { success: false, error: err }
    }
    return { success: false, fieldErrors: err }
  }

  return {
    success: true,
    id: result.right.id,
    name: result.right.name,
    slug: result.right.slug,
  }
}
