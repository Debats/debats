import { Effect, pipe } from 'effect'
import { deleteTheme } from '../aggregates/theme'
import { runUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { decideOnTheme, themeAggregate } from './theme-stream'

type DeleteThemeParams = {
  contributor: ContributorIdentity | null
  themeId: string
}

/** Removes a theme; the subjects it gathered keep their other themes */
export function deleteThemeUseCase(params: DeleteThemeParams) {
  const { themeId } = params

  return pipe(
    allowedTo(params.contributor, 'delete_theme', 'supprimer une thématique'),
    Effect.tap(() => ensureStream(themeAggregate, themeId)),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) => decideOnTheme(events, themeId, contributor.id, deleteTheme())),
    ),
    Effect.asVoid,
  )
}
