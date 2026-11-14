import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { generateOccupationFamilySlug, OccupationFamilyId } from '../entities/occupation-family'
import { addOccupationFamily } from '../aggregates/occupation-family'
import { runUnitOfWork } from '../events/unit-of-work'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { openStream } from './aggregate-stream'
import { allowedTo, fieldsOf, free } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { FAMILY_NAME_INVALID, FAMILY_NAME_TAKEN, FamilyNameInput } from './occupation-family-name'
import { occupationFamilyAggregate } from './occupation-family-stream'

const CreateOccupationFamilyInput = S.Struct({ name: FamilyNameInput, description: S.String })

type CreateOccupationFamilyParams = S.Schema.Encoded<typeof CreateOccupationFamilyInput> & {
  contributor: ContributorIdentity | null
}

export type { FieldErrors }

/** Read side: the name must be free, and the family takes the last place */
const families = Effect.serviceFunctions(OccupationFamilyRepository)

const lastPlace = Effect.map(
  families.findAll(),
  (all) => Math.max(0, ...all.map((f) => f.position)) + 1,
)

/** Adds a family at the end of the list; Idéalistes only, one per name. */
export function createOccupationFamilyUseCase(params: CreateOccupationFamilyParams) {
  const { name, description } = params
  // The command names the family: the stream exists from its first event
  const id = OccupationFamilyId.make(crypto.randomUUID())

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_occupation', 'créer une famille de métiers'),
      input: fieldsOf(CreateOccupationFamilyInput, { name: FAMILY_NAME_INVALID })({
        name,
        description,
      }),
    }),
    Effect.tap(({ input }) =>
      Effect.flatMap(
        families.findBySlug(generateOccupationFamilySlug(input.name)),
        free(FAMILY_NAME_TAKEN, 'name'),
      ),
    ),
    Effect.bind('position', () => lastPlace),
    Effect.flatMap(({ contributor, input, position }) =>
      runUnitOfWork((events) =>
        openStream(
          occupationFamilyAggregate,
          events,
          id,
          addOccupationFamily({ ...input, position }),
          contributor.id,
        ),
      ),
    ),
    uniqueTakenAs('name', FAMILY_NAME_TAKEN),
    Effect.map(({ state }) => state.family),
  )
}
