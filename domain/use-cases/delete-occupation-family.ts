import { Either, Effect } from 'effect'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type DeleteOccupationFamilyParams = {
  contributor: ContributorIdentity | null
  familyId: string
  familyRepo: OccupationFamilyRepository
}

/** Removes a family and its occupations; the figures holding them simply lose them. */
export async function deleteOccupationFamilyUseCase(
  params: DeleteOccupationFamilyParams,
): Promise<Either.Either<void, string>> {
  const { contributor, familyId, familyRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_occupation')) {
    const rank = requiredRank('delete_occupation')
    return Either.left(`Vous devez être ${rank} pour supprimer une famille de métiers.`)
  }

  const family = await Effect.runPromise(familyRepo.findById(familyId))
  if (!family) {
    return Either.left('La famille est introuvable.')
  }

  await Effect.runPromise(familyRepo.delete(familyId))
  return Either.right(undefined)
}
