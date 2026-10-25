import { Either, Effect, pipe } from 'effect'
import { OccupationAssignmentInput } from '../read-models/occupations'
import { setOccupations } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { ensureStream } from './aggregate-stream'
import { runCommand } from './run-command'
import {
  decideOnPublicFigure,
  publicFigureAggregate,
  PublicFigureSource,
} from './public-figure-stream'

type SetPublicFigureOccupationsParams = {
  contributor: ContributorIdentity | null
  publicFigureId: string
  assignments: OccupationAssignmentInput[]
  /** The revision the selector was rendered from; a draft's validation has none and decides from the current state */
  revision?: number
  runUnitOfWork: RunUnitOfWork
  publicFigureSource: PublicFigureSource
  /** Read side: every occupation must be on the closed list */
  occupationRepo: OccupationRepository
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
  const { contributor, publicFigureId, runUnitOfWork, publicFigureSource, occupationRepo } = params
  const assignments = dedupe(params.assignments)

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'assign_occupation')) {
    const rank = requiredRank('assign_occupation')
    return Either.left(`Vous devez être ${rank} pour modifier les métiers d’une personnalité.`)
  }

  const ids = assignments.map((a) => a.occupationId)
  const found = await Effect.runPromise(occupationRepo.findByIds(ids))
  if (found.length !== ids.length) {
    return Either.left('Un des métiers choisis n’existe plus.')
  }

  const outcome = await runCommand(
    pipe(
      ensureStream(publicFigureAggregate, runUnitOfWork, publicFigureId, publicFigureSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          decideOnPublicFigure(
            events,
            publicFigureId,
            contributor.id,
            () => Effect.succeed([setOccupations(assignments)]),
            params.revision,
          ),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  return Either.right(undefined)
}
