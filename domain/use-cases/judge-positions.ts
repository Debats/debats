import { Effect, pipe, Schema as S } from 'effect'
import { judgePositions } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { allowedTo, decoded } from './preconditions'
import { decideOnSubject } from './subject-stream'
import { ContributorIdentity } from './types'

const PositionsVerdictInput = S.Struct({
  subjectId: S.NonEmptyString,
  positionIds: S.Tuple(S.NonEmptyString, S.NonEmptyString),
  compatible: S.Boolean,
})

export type PositionsVerdict = S.Schema.Encoded<typeof PositionsVerdictInput>

type JudgePositionsParams = PositionsVerdict & { contributor: ContributorIdentity | null }

/**
 * Says whether two positions of a subject are held together or against each
 * other. The verdict holds for everyone who takes the two, hence the rank. It
 * comes from a switch that saves at once and decides from the current state:
 * no revision, the last verdict stands.
 */
export function judgePositionsUseCase(params: JudgePositionsParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(
        params.contributor,
        'judge_positions',
        'dire si deux positions sont compatibles',
      ),
      verdict: decoded(PositionsVerdictInput)(params),
    }),
    Effect.flatMap(({ contributor, verdict: { subjectId, positionIds, compatible } }) =>
      runUnitOfWork((events) =>
        decideOnSubject(
          events,
          subjectId,
          contributor.id,
          judgePositions(positionIds[0], positionIds[1], compatible),
        ),
      ),
    ),
    Effect.asVoid,
  )
}
