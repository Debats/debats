import { Either, Effect } from 'effect'
import { OccupationRepository } from '../repositories/occupation-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type SetPublicFigureOccupationsParams = {
  contributor: ContributorIdentity | null
  publicFigureId: string
  occupationIds: string[]
  occupationRepo: OccupationRepository
  publicFigureRepo: PublicFigureRepository
}

/** Replaces the occupations a public figure holds; every id must name a listed occupation. */
export async function setPublicFigureOccupationsUseCase(
  params: SetPublicFigureOccupationsParams,
): Promise<Either.Either<void, string>> {
  const { contributor, publicFigureId, occupationRepo, publicFigureRepo } = params
  const occupationIds = Array.from(new Set(params.occupationIds))

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'assign_occupation')) {
    const rank = requiredRank('assign_occupation')
    return Either.left(`Vous devez être ${rank} pour modifier les métiers d’une personnalité.`)
  }

  const figure = await Effect.runPromise(publicFigureRepo.findById(publicFigureId))
  if (!figure) {
    return Either.left('La personnalité est introuvable.')
  }

  const found = await Effect.runPromise(occupationRepo.findByIds(occupationIds))
  if (found.length !== occupationIds.length) {
    return Either.left('Un des métiers choisis n’existe plus.')
  }

  await Effect.runPromise(
    occupationRepo.setAssignments(publicFigureId, occupationIds, contributor.id),
  )
  return Either.right(undefined)
}
