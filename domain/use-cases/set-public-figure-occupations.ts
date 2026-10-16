import { Either, Effect } from 'effect'
import { OccupationAssignmentInput } from '../read-models/occupations'
import { OccupationRepository } from '../repositories/occupation-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type SetPublicFigureOccupationsParams = {
  contributor: ContributorIdentity | null
  publicFigureId: string
  assignments: OccupationAssignmentInput[]
  occupationRepo: OccupationRepository
  publicFigureRepo: PublicFigureRepository
}

/** One entry per occupation; the last word on « current » wins */
function dedupe(assignments: OccupationAssignmentInput[]): OccupationAssignmentInput[] {
  const byId = new Map<string, boolean>()
  for (const { occupationId, current } of assignments) byId.set(occupationId, current)
  return Array.from(byId, ([occupationId, current]) => ({ occupationId, current }))
}

/**
 * Replaces the occupations a public figure holds, current or former; every id
 * must name a listed occupation.
 */
export async function setPublicFigureOccupationsUseCase(
  params: SetPublicFigureOccupationsParams,
): Promise<Either.Either<void, string>> {
  const { contributor, publicFigureId, occupationRepo, publicFigureRepo } = params
  const assignments = dedupe(params.assignments)

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

  const ids = assignments.map((a) => a.occupationId)
  const found = await Effect.runPromise(occupationRepo.findByIds(ids))
  if (found.length !== ids.length) {
    return Either.left('Un des métiers choisis n’existe plus.')
  }

  await Effect.runPromise(
    occupationRepo.setAssignments(publicFigureId, assignments, contributor.id),
  )
  return Either.right(undefined)
}
