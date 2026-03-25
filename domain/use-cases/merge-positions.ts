import { Effect, Either } from 'effect'
import { PositionRepository } from '../repositories/position-repository'
import { canPerform } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type MergePositionsParams = {
  sourcePositionId: string
  targetPositionId: string
  contributor: ContributorIdentity
  positionRepo: PositionRepository
}

export async function mergePositions(
  params: MergePositionsParams,
): Promise<Either.Either<void, string>> {
  const { sourcePositionId, targetPositionId, contributor, positionRepo } = params

  if (sourcePositionId === targetPositionId) {
    return Either.left('Les deux positions sont identiques.')
  }

  if (!canPerform(contributor.reputation, 'admin')) {
    return Either.left('Vous devez être Fondateur pour fusionner des positions.')
  }

  const sourceResult = await Effect.runPromise(
    Effect.either(positionRepo.findById(sourcePositionId)),
  )
  if (sourceResult._tag === 'Left')
    return Either.left('Erreur lors de la lecture de la position source.')
  if (!sourceResult.right) return Either.left('La position source est introuvable.')
  const source = sourceResult.right

  const targetResult = await Effect.runPromise(
    Effect.either(positionRepo.findById(targetPositionId)),
  )
  if (targetResult._tag === 'Left')
    return Either.left('Erreur lors de la lecture de la position cible.')
  if (!targetResult.right) return Either.left('La position cible est introuvable.')
  const target = targetResult.right

  if (source.subjectId !== target.subjectId) {
    return Either.left('Les deux positions doivent appartenir au même sujet.')
  }

  const mergeResult = await Effect.runPromise(
    Effect.either(positionRepo.mergeInto(sourcePositionId, targetPositionId)),
  )
  if (mergeResult._tag === 'Left') {
    return Either.left('Erreur lors de la fusion des positions.')
  }

  return Either.right(undefined)
}
