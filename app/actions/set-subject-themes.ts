'use server'

import { Either } from 'effect'
import { ThemeId } from '../../domain/entities/theme'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { setSubjectThemesUseCase } from '../../domain/use-cases/set-subject-themes'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type SetThemesResult = { success: true } | { success: false; error: string }

export async function setSubjectThemesAction(
  subjectId: string,
  themeIds: string[],
): Promise<SetThemesResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await setSubjectThemesUseCase({
    contributor,
    subjectId,
    themeIds: themeIds.map((id) => ThemeId.make(id)),
    themeRepo: createThemeRepository(supabase),
    subjectRepo: createSubjectRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
