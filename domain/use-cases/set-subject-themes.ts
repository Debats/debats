import { Effect, pipe } from 'effect'
import { ThemeId } from '../entities/theme'
import { setSubjectThemes } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { ThemeRepository } from '../repositories/theme-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { decideOnSubject, subjectAggregate } from './subject-stream'

type SetSubjectThemesParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  themeIds: ThemeId[]
  primaryThemeId: ThemeId | null
  /** The revision the selector was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
}

const PRIMARY_REQUIRED =
  'Une thématique principale doit être définie quand des thématiques sont sélectionnées.'
const PRIMARY_AMONG_CHOSEN =
  'La thématique principale doit faire partie des thématiques sélectionnées.'

/** Read side: every theme must exist */
const themes = Effect.serviceFunctions(ThemeRepository)

/** On success, the revision the next change of the selector must be rendered from */
export function setSubjectThemesUseCase(params: SetSubjectThemesParams) {
  const { subjectId, themeIds, primaryThemeId, revision } = params
  const assignments = themeIds.map((themeId) => ({
    themeId,
    isPrimary: themeId === primaryThemeId,
  }))

  return pipe(
    allowedTo(params.contributor, 'assign_theme', "modifier les thématiques d'un sujet"),
    Effect.filterOrFail(
      () => themeIds.length === 0 || primaryThemeId !== null,
      () => new Rejected(PRIMARY_REQUIRED),
    ),
    Effect.filterOrFail(
      () => primaryThemeId === null || themeIds.includes(primaryThemeId),
      () => new Rejected(PRIMARY_AMONG_CHOSEN),
    ),
    Effect.tap(() => (themeIds.length > 0 ? allKnown(themeIds) : Effect.void)),
    Effect.tap(() => ensureStream(subjectAggregate, subjectId)),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) =>
        decideOnSubject(
          events,
          subjectId,
          contributor.id,
          () => Effect.succeed([setSubjectThemes(assignments)]),
          revision,
        ),
      ),
    ),
    Effect.map(({ revision }) => revision),
  )
}

/** Every chosen theme is on the list; the first missing one is named */
function allKnown(themeIds: ThemeId[]) {
  return Effect.flatMap(themes.findByIds(themeIds), (found) => {
    const foundIds = new Set(found.map((t) => t.id))
    const missing = themeIds.find((id) => !foundIds.has(id))
    return missing
      ? Effect.fail(new Rejected(`La thématique ${missing} est introuvable.`))
      : Effect.void
  })
}
