import { Either, Effect } from 'effect'
import { OccupationRepository } from '../repositories/occupation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type DeleteOccupationParams = {
  contributor: ContributorIdentity | null
  occupationId: string
  occupationRepo: OccupationRepository
}

/** Removes an occupation from the list; the figures holding it simply lose it. */
export async function deleteOccupationUseCase(
  params: DeleteOccupationParams,
): Promise<Either.Either<void, string>> {
  const { contributor, occupationId, occupationRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_occupation')) {
    const rank = requiredRank('delete_occupation')
    return Either.left(`Vous devez être ${rank} pour supprimer un métier.`)
  }

  const occupation = await Effect.runPromise(occupationRepo.findById(occupationId))
  if (!occupation) {
    return Either.left('Le métier est introuvable.')
  }

  await Effect.runPromise(occupationRepo.delete(occupationId))
  return Either.right(undefined)
}
