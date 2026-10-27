import { Either, Effect, pipe } from 'effect'
import { removeOccupation } from '../aggregates/occupation-family'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { runCommand } from './run-command'
import {
  decideOnOccupationFamily,
  occupationFamilyAggregate,
  OccupationFamilySource,
} from './occupation-family-stream'

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
export function deleteOccupationUseCase(
  params: DeleteOccupationParams,
): Promise<Either.Either<void, string>> {
  const { occupationId, runUnitOfWork, familySource, occupationRepo } = params

  return runCommand(
    pipe(
      Effect.all({
        contributor: allowedTo(params.contributor, 'delete_occupation', 'supprimer un métier'),
        familyId: Effect.map(
          Effect.flatMap(occupationRepo.findById(occupationId), found(NOT_FOUND)),
          (occupation) => occupation.familyId,
        ),
      }),
      Effect.tap(({ familyId }) =>
        ensureStream(occupationFamilyAggregate, runUnitOfWork, familyId, familySource),
      ),
      Effect.flatMap(({ contributor, familyId }) =>
        runUnitOfWork((events) =>
          decideOnOccupationFamily(events, familyId, contributor.id, (state) =>
            state.occupations.some((o) => o.id === occupationId)
              ? Effect.succeed([removeOccupation(occupationId)])
              : Effect.fail(new Rejected(NOT_FOUND)),
          ),
        ),
      ),
      Effect.asVoid,
    ),
  )
}
