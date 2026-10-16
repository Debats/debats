import { Either, Effect } from 'effect'
import {
  createOccupationFamily,
  generateOccupationFamilySlug,
  OccupationFamily,
} from '../entities/occupation-family'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

type CreateOccupationFamilyParams = {
  contributor: ContributorIdentity | null
  name: string
  description: string
  familyRepo: OccupationFamilyRepository
}

const NAME_MIN = 2
const NAME_MAX = 50

/** Adds a family at the end of the list; Idéalistes only, one per name. */
export async function createOccupationFamilyUseCase(
  params: CreateOccupationFamilyParams,
): Promise<Either.Either<OccupationFamily, string | FieldErrors>> {
  const { contributor, familyRepo } = params
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

  const family = createOccupationFamily({
    name,
    description: params.description,
    position,
    createdBy: contributor.id,
  })
  return Either.right(await Effect.runPromise(familyRepo.create(family)))
}
