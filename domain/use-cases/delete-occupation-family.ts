import { Either, Effect, pipe } from 'effect'
import { deleteOccupationFamily } from '../aggregates/occupation-family'
import { RunUnitOfWork } from '../events/unit-of-work'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { ensureStream } from './aggregate-stream'
import { runCommand } from './run-command'
import {
  decideOnOccupationFamily,
  occupationFamilyAggregate,
  OccupationFamilySource,
} from './occupation-family-stream'

type DeleteOccupationFamilyParams = {
  contributor: ContributorIdentity | null
  familyId: string
  runUnitOfWork: RunUnitOfWork
  familySource: OccupationFamilySource
}

/** Removes a family and its occupations; the figures holding them simply lose them. */
export async function deleteOccupationFamilyUseCase(
  params: DeleteOccupationFamilyParams,
): Promise<Either.Either<void, string>> {
  const { contributor, familyId, runUnitOfWork, familySource } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_occupation')) {
    const rank = requiredRank('delete_occupation')
    return Either.left(`Vous devez être ${rank} pour supprimer une famille de métiers.`)
  }

  const outcome = await runCommand(
    pipe(
      ensureStream(occupationFamilyAggregate, runUnitOfWork, familyId, familySource),
      Effect.andThen(
        runUnitOfWork((events) =>
          decideOnOccupationFamily(events, familyId, contributor.id, () =>
            Effect.succeed([deleteOccupationFamily()]),
          ),
        ),
      ),
    ),
  )
  return Either.map(outcome, () => undefined)
}
