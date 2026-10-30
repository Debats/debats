import { Effect, pipe } from 'effect'
import { deleteOccupationFamily } from '../aggregates/occupation-family'
import { runUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { allowedTo } from './preconditions'
import { decideOnOccupationFamily, occupationFamilyAggregate } from './occupation-family-stream'

type DeleteOccupationFamilyParams = {
  contributor: ContributorIdentity | null
  familyId: string
}

/** Removes a family and its occupations; the figures holding them simply lose them. */
export function deleteOccupationFamilyUseCase(params: DeleteOccupationFamilyParams) {
  const { familyId } = params

  return pipe(
    allowedTo(params.contributor, 'delete_occupation', 'supprimer une famille de métiers'),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) =>
        decideOnOccupationFamily(events, familyId, contributor.id, deleteOccupationFamily()),
      ),
    ),
    Effect.asVoid,
  )
}
