import { Either, Effect } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter } from 'effect/ParseResult'
import { createTheme, generateThemeSlug, Theme } from '../entities/theme'
import { ThemeRepository } from '../repositories/theme-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

const CreateThemeInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(50)),
  description: S.String.pipe(S.minLength(10)),
})

type CreateThemeParams = {
  contributor: ContributorIdentity | null
  name: string
  description: string
  themeRepo: ThemeRepository
}

export async function createThemeUseCase(
  params: CreateThemeParams,
): Promise<Either.Either<Theme, string | FieldErrors>> {
  const { contributor, name, description, themeRepo } = params

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

  const theme = createTheme({ name, description, createdBy: contributor.id })
  const created = await Effect.runPromise(themeRepo.create(theme))

  return Either.right(created)
}
