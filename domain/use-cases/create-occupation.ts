import { Either, Effect } from 'effect'
import { createOccupation, generateOccupationSlug, Occupation } from '../entities/occupation'
import { OccupationRepository } from '../repositories/occupation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

type CreateOccupationParams = {
  contributor: ContributorIdentity | null
  name: string
  description: string
  occupationRepo: OccupationRepository
}

const NAME_MIN = 2
const NAME_MAX = 50

/** Adds an occupation to the closed list; Idéalistes only, one per name. */
export async function createOccupationUseCase(
  params: CreateOccupationParams,
): Promise<Either.Either<Occupation, string | FieldErrors>> {
  const { contributor, occupationRepo } = params
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

  const occupation = createOccupation({
    name,
    description: params.description,
    createdBy: contributor.id,
  })
  return Either.right(await Effect.runPromise(occupationRepo.create(occupation)))
}
