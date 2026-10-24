import { Effect, Either, pipe } from 'effect'
import { Argument, sameArgumentTitle } from '../entities/argument'
import { renameArgument } from '../aggregates/argument'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ArgumentRepository } from '../repositories/argument-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
import { ensureStream } from './aggregate-stream'
import { runFormCommand } from './run-command'
import { argumentAggregate, ArgumentSource, decideOnArgument } from './argument-stream'

type RenameArgumentParams = {
  contributor: ContributorIdentity | null
  argumentId: string
  title: string
  description: string
  runUnitOfWork: RunUnitOfWork
  argumentSource: ArgumentSource
  /** Read side: the argument must exist and no other may bear the new title */
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

  const renamed = renameArgument({ title, description: params.description })
  const outcome = await runFormCommand(
    pipe(
      ensureStream(argumentAggregate, params.runUnitOfWork, existing.id, params.argumentSource),
      Effect.andThen(
        params.runUnitOfWork((events) =>
          decideOnArgument(events, existing.id, contributor.id, () => Effect.succeed([renamed])),
        ),
      ),
    ),
  )
  return Either.map(outcome, (state) => state.argument)
}
