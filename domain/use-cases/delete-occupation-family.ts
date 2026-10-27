import { Either, Effect, pipe } from 'effect'
import { deleteOccupationFamily } from '../aggregates/occupation-family'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo } from './preconditions'
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
export function deleteOccupationFamilyUseCase(
  params: DeleteOccupationFamilyParams,
): Promise<Either.Either<void, string>> {
  const { familyId, runUnitOfWork, familySource } = params

  return runCommand(
    pipe(
      allowedTo(params.contributor, 'delete_occupation', 'supprimer une famille de métiers'),
      Effect.tap(() =>
        ensureStream(occupationFamilyAggregate, runUnitOfWork, familyId, familySource),
      ),
      Effect.flatMap((contributor) =>
        runUnitOfWork((events) =>
          decideOnOccupationFamily(events, familyId, contributor.id, () =>
            Effect.succeed([deleteOccupationFamily()]),
          ),
        ),
      ),
      Effect.asVoid,
    ),
  )
}
