import { Either, Effect, pipe } from 'effect'
import {
  generateOccupationFamilySlug,
  OccupationFamily,
  OccupationFamilyId,
} from '../entities/occupation-family'
import {
  addOccupationFamily,
  occupationFamilyStream,
  replayOccupationFamily,
} from '../aggregates/occupation-family'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
import { runCommand } from './run-command'
import { requireOccupationFamilyState } from './occupation-family-stream'

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

/** Adds a family at the end of the list; Idéalistes only, one per name. */
export async function createOccupationFamilyUseCase(
  params: CreateOccupationFamilyParams,
): Promise<Either.Either<OccupationFamily, string | FieldErrors>> {
  const { contributor, description, runUnitOfWork, familyRepo } = params
  const name = params.name.trim()

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_occupation')) {
    const rank = requiredRank('add_occupation')
    return Either.left(`Vous devez être ${rank} pour créer une famille de métiers.`)
  }

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return Either.left({ name: `Le nom doit faire entre ${NAME_MIN} et ${NAME_MAX} caractères.` })
  }

  const existing = await Effect.runPromise(
    familyRepo.findBySlug(generateOccupationFamilySlug(name)),
  )
  if (existing) {
    return Either.left({ name: 'Une famille porte déjà ce nom.' })
  }

  const families = await Effect.runPromise(familyRepo.findAll())
  const position = Math.max(0, ...families.map((f) => f.position)) + 1

  // The command names the family: the stream exists from its first event
  const id = OccupationFamilyId.make(crypto.randomUUID())
  const outcome = await runCommand(
    runUnitOfWork((events) =>
      pipe(
        events.append(
          occupationFamilyStream(id),
          0,
          [addOccupationFamily({ name, description, position })],
          { actorId: contributor.id },
        ),
        Effect.flatMap(replayOccupationFamily),
        Effect.flatMap(requireOccupationFamilyState),
      ),
    ),
  )

  return Either.map(outcome, (state) => state.family)
}
