import { Effect, pipe } from 'effect'
import { OCCUPATION_NOT_FOUND, removeOccupation } from '../aggregates/occupation-family'
import { runUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { ContributorIdentity } from './types'
import { allowedTo, found } from './preconditions'
import { decideOnOccupationFamily, occupationFamilyAggregate } from './occupation-family-stream'

type DeleteOccupationParams = {
  contributor: ContributorIdentity | null
  occupationId: string
}

/** Read side: which family the occupation belongs to */
const occupations = Effect.serviceFunctions(OccupationRepository)

/** Removes an occupation from the list; the figures holding it simply lose it. */
export function deleteOccupationUseCase(params: DeleteOccupationParams) {
  const { occupationId } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'delete_occupation', 'supprimer un métier'),
      familyId: Effect.map(
        Effect.flatMap(occupations.findById(occupationId), found(OCCUPATION_NOT_FOUND)),
        (occupation) => occupation.familyId,
      ),
    }),
    Effect.flatMap(({ contributor, familyId }) =>
      runUnitOfWork((events) =>
        decideOnOccupationFamily(events, familyId, contributor.id, removeOccupation(occupationId)),
      ),
    ),
    Effect.asVoid,
  )
}
