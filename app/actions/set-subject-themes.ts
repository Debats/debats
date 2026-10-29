'use server'

import { Either } from 'effect'
import { ThemeId } from '../../domain/entities/theme'
import { runLive } from '../../infra/live-services'
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
  const contributor = await getAuthenticatedContributor()

  const result = await runLive(
    setSubjectThemesUseCase({
      contributor,
      subjectId,
      themeIds: themeIds.map((id) => ThemeId.make(id)),
      primaryThemeId: primaryThemeId ? ThemeId.make(primaryThemeId) : null,
      revision,
    }),
  )

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true, revision: result.right }
}
