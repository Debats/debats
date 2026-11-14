import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { renameOccupationFamily } from '../aggregates/occupation-family'
import { generateOccupationFamilySlug } from '../entities/occupation-family'
import { runUnitOfWork } from '../events/unit-of-work'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { allowedTo, fieldsOf } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { FAMILY_NAME_INVALID, FAMILY_NAME_TAKEN, FamilyNameInput } from './occupation-family-name'
import { decideOnOccupationFamily } from './occupation-family-stream'

const RenameOccupationFamilyInput = S.Struct({ name: FamilyNameInput })

/** What the rename form of a family sends: its new name, and the revision it shows. */
export type RenamedOccupationFamily = S.Schema.Encoded<typeof RenameOccupationFamilyInput> & {
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
}

type RenameOccupationFamilyParams = RenamedOccupationFamily & {
  contributor: ContributorIdentity | null
  familyId: string
}

export type { FieldErrors }

/** Read side: no other family may bear the new name */
const families = Effect.serviceFunctions(OccupationFamilyRepository)

/** Two families are told apart by their slug: the same slug is the same name, unless it is its own */
const nameFreeFor = (familyId: string, name: string) =>
  Effect.filterOrFail(
    families.findBySlug(generateOccupationFamilySlug(name)),
    (homonym) => !homonym || homonym.id === familyId,
    () => new Rejected(FAMILY_NAME_TAKEN, 'name'),
  )

/**
 * Gives a family another name; who may add a family may rename one. Its slug
 * follows, so its page moves; its occupations and who holds them are untouched.
 */
export function renameOccupationFamilyUseCase(params: RenameOccupationFamilyParams) {
  const { familyId, revision } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(
        params.contributor,
        'add_occupation',
        'renommer une famille de métiers',
      ),
      input: fieldsOf(RenameOccupationFamilyInput, { name: FAMILY_NAME_INVALID })({
        name: params.name,
      }),
    }),
    Effect.tap(({ input }) => nameFreeFor(familyId, input.name)),
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        decideOnOccupationFamily(
          events,
          familyId,
          contributor.id,
          renameOccupationFamily(input.name),
          revision,
        ),
      ),
    ),
    uniqueTakenAs('name', FAMILY_NAME_TAKEN),
    Effect.map(({ state }) => state.family),
  )
}
