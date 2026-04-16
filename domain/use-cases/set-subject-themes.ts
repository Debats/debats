import { Either, Effect } from 'effect'
import { ThemeId } from '../entities/theme'
import { ThemeRepository } from '../repositories/theme-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type SetSubjectThemesParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  themeIds: ThemeId[]
  primaryThemeId: ThemeId | null
  themeRepo: ThemeRepository
  subjectRepo: SubjectRepository
}

export async function setSubjectThemesUseCase(
  params: SetSubjectThemesParams,
): Promise<Either.Either<void, string>> {
  const { contributor, subjectId, themeIds, primaryThemeId, themeRepo, subjectRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'assign_theme')) {
    const rank = requiredRank('assign_theme')
    return Either.left(`Vous devez être ${rank} pour modifier les thématiques d'un sujet.`)
  }

  const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
  if (!subject) {
    return Either.left('Le sujet est introuvable.')
  }

  if (primaryThemeId !== null && !themeIds.includes(primaryThemeId)) {
    return Either.left('La thématique principale doit faire partie des thématiques sélectionnées.')
  }

  if (themeIds.length > 0) {
    const foundThemes = await Effect.runPromise(themeRepo.findByIds(themeIds))
    if (foundThemes.length !== themeIds.length) {
      const foundIds = new Set(foundThemes.map((t) => t.id))
      const missing = themeIds.find((id) => !foundIds.has(id))
      return Either.left(`La thématique ${missing} est introuvable.`)
    }
  }

  const assignments = themeIds.map((themeId) => ({
    themeId,
    isPrimary: themeId === primaryThemeId,
  }))

  await Effect.runPromise(themeRepo.setAssignments(subjectId, assignments, contributor.id))

  return Either.right(undefined)
}
