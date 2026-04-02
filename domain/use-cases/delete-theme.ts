import { Either, Effect } from 'effect'
import { ThemeRepository } from '../repositories/theme-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type DeleteThemeParams = {
  contributor: ContributorIdentity | null
  themeId: string
  themeRepo: ThemeRepository
}

export async function deleteThemeUseCase(
  params: DeleteThemeParams,
): Promise<Either.Either<void, string>> {
  const { contributor, themeId, themeRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_theme')) {
    const rank = requiredRank('delete_theme')
    return Either.left(`Vous devez être ${rank} pour supprimer une thématique.`)
  }

  const theme = await Effect.runPromise(themeRepo.findById(themeId))
  if (!theme) {
    return Either.left('La thématique est introuvable.')
  }

  await Effect.runPromise(themeRepo.delete(themeId))

  return Either.right(undefined)
}
