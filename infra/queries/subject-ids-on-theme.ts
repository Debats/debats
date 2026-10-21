import { Effect } from 'effect'
import { ThemeRepository } from '../../domain/repositories/theme-repository'

/** The subjects carrying the theme of this slug; none for a slug nobody knows */
export const subjectIdsOnTheme = (
  themeRepo: ThemeRepository,
  themeSlug: string,
): Promise<string[]> =>
  Effect.runPromise(
    Effect.flatMap(themeRepo.findBySlug(themeSlug), (theme) =>
      theme ? themeRepo.findSubjectIdsByThemeId(theme.id) : Effect.succeed([]),
    ),
  )
