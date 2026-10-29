import { Effect, pipe } from 'effect'
import { generateOccupationFamilySlug, OccupationFamilyId } from '../entities/occupation-family'
import { addOccupationFamily } from '../aggregates/occupation-family'
import { runUnitOfWork } from '../events/unit-of-work'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { openStream } from './aggregate-stream'
import { allowedTo, free } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { occupationFamilyAggregate } from './occupation-family-stream'

type CreateOccupationFamilyParams = {
  contributor: ContributorIdentity | null
  name: string
  description: string
}

export type { FieldErrors }

const NAME_MIN = 2
const NAME_MAX = 50
const NAME_TAKEN = 'Une famille porte déjà ce nom.'

/** Read side: the name must be free, and the family takes the last place */
const families = Effect.serviceFunctions(OccupationFamilyRepository)

/** Adds a family at the end of the list; Idéalistes only, one per name. */
export function createOccupationFamilyUseCase(params: CreateOccupationFamilyParams) {
  const { description } = params
  const name = params.name.trim()
  // The command names the family: the stream exists from its first event
  const id = OccupationFamilyId.make(crypto.randomUUID())

  const lastPlace = Effect.map(
    families.findAll(),
    (all) => Math.max(0, ...all.map((f) => f.position)) + 1,
  )

  return pipe(
    allowedTo(params.contributor, 'add_occupation', 'créer une famille de métiers'),
    Effect.filterOrFail(
      () => name.length >= NAME_MIN && name.length <= NAME_MAX,
      () => new Rejected(`Le nom doit faire entre ${NAME_MIN} et ${NAME_MAX} caractères.`, 'name'),
    ),
    Effect.tap(() =>
      Effect.flatMap(
        families.findBySlug(generateOccupationFamilySlug(name)),
        free(NAME_TAKEN, 'name'),
      ),
    ),
    Effect.bindTo('contributor'),
    Effect.bind('position', () => lastPlace),
    Effect.flatMap(({ contributor, position }) =>
      runUnitOfWork((events) =>
        openStream(
          occupationFamilyAggregate,
          events,
          id,
          [addOccupationFamily({ name, description, position })],
          contributor.id,
        ),
      ),
    ),
    uniqueTakenAs('name', NAME_TAKEN),
    Effect.map(({ state }) => state.family),
  )
}
