import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter } from 'effect/ParseResult'
import { generateThemeSlug, Theme, ThemeId } from '../entities/theme'
import { addTheme } from '../aggregates/theme'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ThemeRepository } from '../repositories/theme-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
import { openStream } from './aggregate-stream'
import { runCommand, uniqueTakenAs } from './run-command'
import { themeAggregate } from './theme-stream'

const CreateThemeInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(50)),
  description: S.String.pipe(S.minLength(10)),
})

type CreateThemeParams = {
  contributor: ContributorIdentity | null
  name: string
  description: string
  runUnitOfWork: RunUnitOfWork
  /** Read side: the name must be free */
  themeRepo: ThemeRepository
}

export async function createThemeUseCase(
  params: CreateThemeParams,
): Promise<Either.Either<Theme, string | FieldErrors>> {
  const { contributor, name, description, runUnitOfWork, themeRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_theme')) {
    const rank = requiredRank('add_theme')
    return Either.left(`Vous devez être ${rank} pour créer une thématique.`)
  }

  const decoded = S.decodeUnknownEither(CreateThemeInput, { errors: 'all' })({ name, description })

  if (Either.isLeft(decoded)) {
    const issues = ArrayFormatter.formatErrorSync(decoded.left)
    const fieldErrors: FieldErrors = {}
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'name') {
        fieldErrors.name = 'Le nom doit faire entre 2 et 50 caractères.'
      } else if (field === 'description') {
        fieldErrors.description = 'La description doit faire au moins 10 caractères.'
      }
    }
    return Either.left(Object.keys(fieldErrors).length > 0 ? fieldErrors : 'Données invalides.')
  }

  const slug = generateThemeSlug(name)
  const existing = await Effect.runPromise(themeRepo.findBySlug(slug))
  if (existing) {
    return Either.left('Une thématique avec ce nom existe déjà.')
  }

  // The command names the theme: the stream exists from its first event
  const id = ThemeId.make(crypto.randomUUID())
  const outcome = await runCommand(
    pipe(
      runUnitOfWork((events) =>
        openStream(themeAggregate, events, id, [addTheme({ name, description })], contributor.id),
      ),
      uniqueTakenAs('name', 'Une thématique avec ce nom existe déjà.'),
    ),
  )

  return Either.map(outcome, ({ state }) => state.theme)
}
