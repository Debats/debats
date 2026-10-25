'use server'

import { Either } from 'effect'
import { ThemeId } from '../../domain/entities/theme'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createSubjectSource } from '../../infra/events/sources'
import { currentRevision } from '../../infra/events/stream-revision'
import { subjectStream } from '../../domain/aggregates/subject'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { setSubjectThemesUseCase } from '../../domain/use-cases/set-subject-themes'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

/** On success, the revision the next change must be rendered from */
export type SetThemesResult =
  | { success: true; revision: number }
  | { success: false; error: string }

export async function setSubjectThemesAction(
  subjectId: string,
  themeIds: string[],
  primaryThemeId: string | null,
  revision: number,
): Promise<SetThemesResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await setSubjectThemesUseCase({
    contributor,
    subjectId,
    themeIds: themeIds.map((id) => ThemeId.make(id)),
    primaryThemeId: primaryThemeId ? ThemeId.make(primaryThemeId) : null,
    revision,
    runUnitOfWork,
    subjectSource: createSubjectSource(supabase),
    themeRepo: createThemeRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true, revision: await currentRevision(subjectStream(subjectId)) }
}
