import { Effect, Either } from 'effect'
import { Argument, renameArgument, sameArgumentTitle } from '../entities/argument'
import { ArgumentRepository } from '../repositories/argument-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

type RenameArgumentParams = {
  contributor: ContributorIdentity | null
  argumentId: string
  title: string
  description: string
  argumentRepo: ArgumentRepository
}

export type { FieldErrors }

/** Corrects an argument's wording; its links to statements are untouched. */
export async function renameArgumentUseCase(
  params: RenameArgumentParams,
): Promise<Either.Either<Argument, string | FieldErrors>> {
  const { contributor, argumentId, argumentRepo } = params
  const title = params.title.trim()

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'edit_argument')) {
    const rank = requiredRank('edit_argument')
    return Either.left(`Vous devez être ${rank} pour modifier un argument.`)
  }

  if (title.length < 3 || title.length > 255) {
    return Either.left({ title: 'Le titre doit faire entre 3 et 255 caractères.' })
  }

  const existing = await Effect.runPromise(argumentRepo.findById(argumentId))
  if (!existing) {
    return Either.left('Argument introuvable.')
  }

  const homonym = await Effect.runPromise(argumentRepo.findByTitle(title))
  if (homonym && homonym.id !== existing.id && !sameArgumentTitle(homonym.title, existing.title)) {
    return Either.left({
      title: 'Un argument porte déjà ce titre : fusionnez-les plutôt.',
    })
  }

  const renamed = renameArgument(existing, {
    title,
    description: params.description,
    updatedBy: contributor.id,
  })

  return Either.right(await Effect.runPromise(argumentRepo.update(renamed)))
}
