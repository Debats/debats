import { Effect, pipe } from 'effect'
import { generateOccupationSlug, OccupationId } from '../entities/occupation'
import { addOccupation } from '../aggregates/occupation-family'
import { runUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo, free } from './preconditions'
import { uniqueTakenAs } from './run-command'
import {
  decideOnOccupationFamily,
  occupationFamilyAggregate,
  writtenOccupation,
} from './occupation-family-stream'

type CreateOccupationParams = {
  contributor: ContributorIdentity | null
  name: string
  familyId: string
  description: string
}

export type { FieldErrors }

const NAME_MIN = 2
const NAME_MAX = 50
const NAME_TAKEN = 'Un métier porte déjà ce nom.'
const CHOOSE_A_FAMILY = new Rejected('Choisissez une famille de métiers.', 'familyId')

/** Read side: the name must be free across every family */
const occupations = Effect.serviceFunctions(OccupationRepository)

/** Adds an occupation to a family of the closed list; Idéalistes only, one per name. */
export function createOccupationUseCase(params: CreateOccupationParams) {
  const { familyId, description } = params
  const name = params.name.trim()
  // The command names the occupation, within the stream of its family
  const id = OccupationId.make(crypto.randomUUID())

  return pipe(
    allowedTo(params.contributor, 'add_occupation', 'créer un métier'),
    Effect.filterOrFail(
      () => name.length >= NAME_MIN && name.length <= NAME_MAX,
      () => new Rejected(`Le nom doit faire entre ${NAME_MIN} et ${NAME_MAX} caractères.`, 'name'),
    ),
    Effect.tap(() =>
      Effect.flatMap(
        occupations.findBySlug(generateOccupationSlug(name)),
        free(NAME_TAKEN, 'name'),
      ),
    ),
    Effect.tap(() => ensureStream(occupationFamilyAggregate, familyId)),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) =>
        decideOnOccupationFamily(events, familyId, contributor.id, () =>
          Effect.succeed([addOccupation(id, { name, description })]),
        ),
      ),
    ),
    // A family unknown or deleted meanwhile is blamed on the field, not told as a message
    Effect.catchTag('NotFound', () => Effect.fail(CHOOSE_A_FAMILY)),
    uniqueTakenAs('name', NAME_TAKEN),
    Effect.flatMap(writtenOccupation(id)),
  )
}
