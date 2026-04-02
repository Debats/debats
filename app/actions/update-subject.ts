'use server'

import { Either } from 'effect'
import { ThemeId } from '../../domain/entities/theme'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createReputationRepository } from '../../infra/database/reputation-repository-supabase'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { updateSubjectUseCase } from '../../domain/use-cases/update-subject'
import { setSubjectThemesUseCase } from '../../domain/use-cases/set-subject-themes'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true; slug: string } | { success: false; error: string }

export async function updateSubjectAction(
  subjectId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()
  const subjectRepo = createSubjectRepository(supabase)
  const themeRepo = createThemeRepository(supabase)

  const result = await updateSubjectUseCase({
    contributor,
    subjectId,
    title: String(formData.get('title') ?? ''),
    presentation: String(formData.get('presentation') ?? ''),
    problem: String(formData.get('problem') ?? ''),
    subjectRepo,
    reputationRepo: createReputationRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  let themeIdsRaw: string[]
  try {
    themeIdsRaw = JSON.parse(String(formData.get('themeIds') ?? '[]'))
    if (!Array.isArray(themeIdsRaw)) themeIdsRaw = []
  } catch {
    themeIdsRaw = []
  }

  const themesResult = await setSubjectThemesUseCase({
    contributor,
    subjectId,
    themeIds: themeIdsRaw.map((id) => ThemeId.make(id)),
    themeRepo,
    subjectRepo,
  })

  if (Either.isLeft(themesResult)) {
    return { success: false, error: themesResult.left }
  }

  return { success: true, slug: result.right.slug }
}
