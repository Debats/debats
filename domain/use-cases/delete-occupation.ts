import { Either, Effect } from 'effect'
import { removeOccupation } from '../aggregates/occupation-family'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, Rejected } from './types'
import { runCommand } from './run-command'
import { decideOnOccupationFamily, OccupationFamilySource } from './occupation-family-stream'

type DeleteOccupationParams = {
  contributor: ContributorIdentity | null
  occupationId: string
  runUnitOfWork: RunUnitOfWork
  familySource: OccupationFamilySource
  /** Read side: which family the occupation belongs to */
  occupationRepo: OccupationRepository
}

const NOT_FOUND = 'Le métier est introuvable.'

/** Removes an occupation from the list; the figures holding it simply lose it. */
export async function deleteOccupationUseCase(
  params: DeleteOccupationParams,
): Promise<Either.Either<void, string>> {
  const { contributor, occupationId, runUnitOfWork, familySource, occupationRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_occupation')) {
    const rank = requiredRank('delete_occupation')
    return Either.left(`Vous devez être ${rank} pour supprimer un métier.`)
  }

  const occupation = await Effect.runPromise(occupationRepo.findById(occupationId))
  if (!occupation) {
    return Either.left(NOT_FOUND)
  }

  const outcome = await runCommand(
    runUnitOfWork((events) =>
      decideOnOccupationFamily(
        events,
        occupation.familyId,
        familySource,
        contributor.id,
        (state) =>
          state.occupations.some((o) => o.id === occupationId)
            ? Effect.succeed([removeOccupation(occupationId)])
            : Effect.fail(new Rejected(NOT_FOUND)),
      ),
    ),
  )
  return Either.map(outcome, () => undefined)
}
