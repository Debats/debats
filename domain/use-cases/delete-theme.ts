import { Either, Effect } from 'effect'
import { deleteTheme } from '../aggregates/theme'
import { RunUnitOfWork } from '../events/unit-of-work'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { runCommand } from './run-command'
import { decideOnTheme, ThemeSource } from './theme-stream'

type DeleteThemeParams = {
  contributor: ContributorIdentity | null
  themeId: string
  runUnitOfWork: RunUnitOfWork
  themeSource: ThemeSource
}

/** Removes a theme; the subjects it gathered keep their other themes */
export async function deleteThemeUseCase(
  params: DeleteThemeParams,
): Promise<Either.Either<void, string>> {
  const { contributor, themeId, runUnitOfWork, themeSource } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_theme')) {
    const rank = requiredRank('delete_theme')
    return Either.left(`Vous devez être ${rank} pour supprimer une thématique.`)
  }

  const outcome = await runCommand(
    runUnitOfWork((events) =>
      decideOnTheme(events, themeId, themeSource, contributor.id, () =>
        Effect.succeed([deleteTheme()]),
      ),
    ),
  )
  return Either.map(outcome, () => undefined)
}
