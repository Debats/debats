import { Effect, pipe } from 'effect'
import { OccupationAssignmentInput } from '../read-models/occupations'
import { setOccupations } from '../aggregates/public-figure'
import { runUnitOfWork } from '../events/unit-of-work'
import { OccupationRepository } from '../repositories/occupation-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { decideOnPublicFigure, publicFigureAggregate } from './public-figure-stream'

type SetPublicFigureOccupationsParams = {
  contributor: ContributorIdentity | null
  publicFigureId: string
  assignments: OccupationAssignmentInput[]
  /** The revision the selector was rendered from; a draft's validation has none and decides from the current state */
  revision?: number
}

/** Read side: every occupation must be on the closed list */
const occupations = Effect.serviceFunctions(OccupationRepository)

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
export function setPublicFigureOccupationsUseCase(params: SetPublicFigureOccupationsParams) {
  const { publicFigureId, revision } = params
  const assignments = dedupe(params.assignments)
  const ids = assignments.map((a) => a.occupationId)

  return pipe(
    allowedTo(params.contributor, 'assign_occupation', 'modifier les métiers d’une personnalité'),
    Effect.tap(() =>
      Effect.filterOrFail(
        occupations.findByIds(ids),
        (listed) => listed.length === ids.length,
        () => new Rejected('Un des métiers choisis n’existe plus.'),
      ),
    ),
    Effect.tap(() => ensureStream(publicFigureAggregate, publicFigureId)),
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
