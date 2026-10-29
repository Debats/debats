import { Effect, pipe } from 'effect'
import { removeOccupation } from '../aggregates/occupation-family'
import { runUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { decideOnOccupationFamily, occupationFamilyAggregate } from './occupation-family-stream'

type DeleteOccupationParams = {
  contributor: ContributorIdentity | null
  occupationId: string
}

const NOT_FOUND = 'Le métier est introuvable.'

/** Read side: which family the occupation belongs to */
const occupations = Effect.serviceFunctions(OccupationRepository)

/** Removes an occupation from the list; the figures holding it simply lose it. */
export function deleteOccupationUseCase(params: DeleteOccupationParams) {
  const { occupationId } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'delete_occupation', 'supprimer un métier'),
      familyId: Effect.map(
        Effect.flatMap(occupations.findById(occupationId), found(NOT_FOUND)),
        (occupation) => occupation.familyId,
      ),
    }),
    Effect.tap(({ familyId }) => ensureStream(occupationFamilyAggregate, familyId)),
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
  )
}
