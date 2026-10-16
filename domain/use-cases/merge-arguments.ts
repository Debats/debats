import { Effect, Either } from 'effect'
import { Argument } from '../entities/argument'
import { ArgumentRepository } from '../repositories/argument-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type MergeArgumentsParams = {
  contributor: ContributorIdentity | null
  sourceArgumentId: string
  targetArgumentId: string
  argumentRepo: ArgumentRepository
}

/**
 * Folds a duplicate into the argument that should remain: every statement of
 * the source now mobilises the target, and the source is gone.
 */
export async function mergeArgumentsUseCase(
  params: MergeArgumentsParams,
): Promise<Either.Either<Argument, string>> {
  const { contributor, sourceArgumentId, targetArgumentId, argumentRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_argument')) {
    const rank = requiredRank('delete_argument')
    return Either.left(`Vous devez être ${rank} pour fusionner des arguments.`)
  }

  if (sourceArgumentId === targetArgumentId) {
    return Either.left('Un argument ne peut pas être fusionné avec lui-même.')
  }

  const [source, target] = await Promise.all([
    Effect.runPromise(argumentRepo.findById(sourceArgumentId)),
    Effect.runPromise(argumentRepo.findById(targetArgumentId)),
  ])
  if (!source) return Either.left('L’argument à fusionner est introuvable.')
  if (!target) return Either.left('L’argument cible est introuvable.')

  await Effect.runPromise(argumentRepo.mergeInto(source.id, target.id))

  return Either.right(target)
}
