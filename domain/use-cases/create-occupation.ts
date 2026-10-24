import { Either, Effect, pipe } from 'effect'
import { generateOccupationSlug, Occupation, OccupationId } from '../entities/occupation'
import { addOccupation } from '../aggregates/occupation-family'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { runFormCommand } from './run-command'
import {
  decideOnOccupationFamily,
  occupationFamilyAggregate,
  OccupationFamilySource,
} from './occupation-family-stream'

type CreateOccupationParams = {
  contributor: ContributorIdentity | null
  name: string
  familyId: string
  description: string
  runUnitOfWork: RunUnitOfWork
  familySource: OccupationFamilySource
  /** Read side: the name must be free across every family */
  occupationRepo: OccupationRepository
}

const NAME_MIN = 2
const NAME_MAX = 50
const CHOOSE_A_FAMILY = new Rejected('Choisissez une famille de métiers.', 'familyId')

/** Adds an occupation to a family of the closed list; Idéalistes only, one per name. */
export async function createOccupationUseCase(
  params: CreateOccupationParams,
): Promise<Either.Either<Occupation, string | FieldErrors>> {
  const { contributor, familyId, description, runUnitOfWork, familySource, occupationRepo } = params
  const name = params.name.trim()

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_occupation')) {
    const rank = requiredRank('add_occupation')
    return Either.left(`Vous devez être ${rank} pour créer un métier.`)
  }

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return Either.left({ name: `Le nom doit faire entre ${NAME_MIN} et ${NAME_MAX} caractères.` })
  }

  const existing = await Effect.runPromise(occupationRepo.findBySlug(generateOccupationSlug(name)))
  if (existing) {
    return Either.left({ name: 'Un métier porte déjà ce nom.' })
  }

  // The command names the occupation, within the stream of its family
  const id = OccupationId.make(crypto.randomUUID())
  const outcome = await runFormCommand(
    pipe(
      ensureStream(occupationFamilyAggregate, runUnitOfWork, familyId, familySource),
      Effect.andThen(
        runUnitOfWork((events) =>
          decideOnOccupationFamily(events, familyId, contributor.id, () =>
            Effect.succeed([addOccupation(id, { name, description })]),
          ),
        ),
      ),
      // A family unknown or deleted meanwhile is blamed on the field, not told as a message
      Effect.mapError((failure) =>
        failure._tag === 'Rejected' && failure.message === occupationFamilyAggregate.notFound
          ? CHOOSE_A_FAMILY
          : failure,
      ),
    ),
  )

  return Either.map(outcome, (state) => state.occupations.find((o) => o.id === id)!)
}
