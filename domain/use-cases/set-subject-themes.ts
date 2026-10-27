import { Either, Effect, pipe } from 'effect'
import { ThemeId } from '../entities/theme'
import { setSubjectThemes } from '../aggregates/subject'
import { Revision } from '../events/event-store'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ThemeRepository } from '../repositories/theme-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { ensureStream } from './aggregate-stream'
import { runCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'

type SetSubjectThemesParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  themeIds: ThemeId[]
  primaryThemeId: ThemeId | null
  /** The revision the selector was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
  themeRepo: ThemeRepository
}

/** On success, the revision the next change of the selector must be rendered from */
export async function setSubjectThemesUseCase(
  params: SetSubjectThemesParams,
): Promise<Either.Either<Revision, string>> {
  const {
    contributor,
    subjectId,
    themeIds,
    primaryThemeId,
    runUnitOfWork,
    subjectSource,
    themeRepo,
  } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'assign_theme')) {
    const rank = requiredRank('assign_theme')
    return Either.left(`Vous devez être ${rank} pour modifier les thématiques d'un sujet.`)
  }

  if (themeIds.length > 0 && primaryThemeId === null) {
    return Either.left(
      'Une thématique principale doit être définie quand des thématiques sont sélectionnées.',
    )
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

  const themes = themeIds.map((themeId) => ({ themeId, isPrimary: themeId === primaryThemeId }))

  return runCommand(
    pipe(
      ensureStream(subjectAggregate, runUnitOfWork, subjectId, subjectSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          decideOnSubject(
            events,
            subjectId,
            contributor.id,
            () => Effect.succeed([setSubjectThemes(themes)]),
            params.revision,
          ),
        ),
      ),
      Effect.map(({ revision }) => revision),
    ),
  )
}
