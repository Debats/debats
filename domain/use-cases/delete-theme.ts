import { Either, Effect, pipe } from 'effect'
import { deleteTheme } from '../aggregates/theme'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { runCommand } from './run-command'
import { decideOnTheme, themeAggregate, ThemeSource } from './theme-stream'

type DeleteThemeParams = {
  contributor: ContributorIdentity | null
  themeId: string
  runUnitOfWork: RunUnitOfWork
  themeSource: ThemeSource
}

/** Removes a theme; the subjects it gathered keep their other themes */
export function deleteThemeUseCase(
  params: DeleteThemeParams,
): Promise<Either.Either<void, string>> {
  const { themeId, runUnitOfWork, themeSource } = params

  return runCommand(
    pipe(
      allowedTo(params.contributor, 'delete_theme', 'supprimer une thématique'),
      Effect.tap(() => ensureStream(themeAggregate, runUnitOfWork, themeId, themeSource)),
      Effect.flatMap((contributor) =>
        runUnitOfWork((events) =>
          decideOnTheme(events, themeId, contributor.id, () => Effect.succeed([deleteTheme()])),
        ),
      ),
      Effect.asVoid,
    ),
  )
}
