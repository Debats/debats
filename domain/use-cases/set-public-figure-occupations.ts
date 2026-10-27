import { Either, Effect, pipe } from 'effect'
import { OccupationAssignmentInput } from '../read-models/occupations'
import { setOccupations } from '../aggregates/public-figure'
import { Revision } from '../events/event-store'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo } from './preconditions'
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
 * must name a listed occupation. On success, the revision the next change of
 * the selector must be rendered from.
 */
export function setPublicFigureOccupationsUseCase(
  params: SetPublicFigureOccupationsParams,
): Promise<Either.Either<Revision, string>> {
  return runCommand(setPublicFigureOccupationsCommand(params))
}

/** The command itself, for a process that runs it among others */
export function setPublicFigureOccupationsCommand(params: SetPublicFigureOccupationsParams) {
  const { publicFigureId, revision, runUnitOfWork, publicFigureSource, occupationRepo } = params
  const assignments = dedupe(params.assignments)
  const ids = assignments.map((a) => a.occupationId)

  return pipe(
    allowedTo(params.contributor, 'assign_occupation', 'modifier les métiers d’une personnalité'),
    Effect.tap(() =>
      Effect.filterOrFail(
        occupationRepo.findByIds(ids),
        (listed) => listed.length === ids.length,
        () => new Rejected('Un des métiers choisis n’existe plus.'),
      ),
    ),
    Effect.tap(() =>
      ensureStream(publicFigureAggregate, runUnitOfWork, publicFigureId, publicFigureSource),
    ),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) =>
        decideOnPublicFigure(
          events,
          publicFigureId,
          contributor.id,
          () => Effect.succeed([setOccupations(assignments)]),
          revision,
        ),
      ),
    ),
    Effect.map(({ revision }) => revision),
  )
}
