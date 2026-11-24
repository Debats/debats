import { Effect, pipe } from 'effect'
import { judgePositions } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { allowedTo } from './preconditions'
import { decideOnSubject } from './subject-stream'
import { ContributorIdentity } from './types'

export type PositionsVerdict = {
  subjectId: string
  positionIds: readonly [string, string]
  compatible: boolean
}

type JudgePositionsParams = PositionsVerdict & { contributor: ContributorIdentity | null }

/**
 * Says whether two positions of a subject are held together or against each
 * other. The verdict holds for everyone who takes the two, hence the rank. It
 * comes from a switch that saves at once and decides from the current state:
 * no revision, the last verdict stands.
 */
export function judgePositionsUseCase(params: JudgePositionsParams) {
  const [a, b] = params.positionIds

  return pipe(
    allowedTo(params.contributor, 'judge_positions', 'dire si deux positions sont compatibles'),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) =>
        decideOnSubject(
          events,
          params.subjectId,
          contributor.id,
          judgePositions(a, b, params.compatible),
        ),
      ),
    ),
    Effect.asVoid,
  )
}
