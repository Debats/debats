import { Either, Effect, pipe } from 'effect'
import {
  generateOccupationFamilySlug,
  OccupationFamily,
  OccupationFamilyId,
} from '../entities/occupation-family'
import { addOccupationFamily } from '../aggregates/occupation-family'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { openStream } from './aggregate-stream'
import { allowedTo, free } from './preconditions'
import { runFormCommand, uniqueTakenAs } from './run-command'
import { occupationFamilyAggregate } from './occupation-family-stream'

type CreateOccupationFamilyParams = {
  contributor: ContributorIdentity | null
  name: string
  description: string
  runUnitOfWork: RunUnitOfWork
  /** Read side: the name must be free, and the family takes the last place */
  familyRepo: OccupationFamilyRepository
}

const NAME_MIN = 2
const NAME_MAX = 50
const NAME_TAKEN = 'Une famille porte déjà ce nom.'

/** Adds a family at the end of the list; Idéalistes only, one per name. */
export function createOccupationFamilyUseCase(
  params: CreateOccupationFamilyParams,
): Promise<Either.Either<OccupationFamily, string | FieldErrors>> {
  const { description, runUnitOfWork, familyRepo } = params
  const name = params.name.trim()
  // The command names the family: the stream exists from its first event
  const id = OccupationFamilyId.make(crypto.randomUUID())

  const lastPlace = Effect.map(
    familyRepo.findAll(),
    (families) => Math.max(0, ...families.map((f) => f.position)) + 1,
  )

  return runFormCommand(
    pipe(
      allowedTo(params.contributor, 'add_occupation', 'créer une famille de métiers'),
      Effect.filterOrFail(
        () => name.length >= NAME_MIN && name.length <= NAME_MAX,
        () =>
          new Rejected(`Le nom doit faire entre ${NAME_MIN} et ${NAME_MAX} caractères.`, 'name'),
      ),
      Effect.tap(() =>
        Effect.flatMap(
          familyRepo.findBySlug(generateOccupationFamilySlug(name)),
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
    ),
  )
}
