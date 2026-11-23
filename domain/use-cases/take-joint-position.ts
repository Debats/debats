import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { signatureOf, takePosition } from '../aggregates/joint-declaration'
import { runUnitOfWork } from '../events/unit-of-work'
import { decideOnJointDeclaration } from './joint-declaration-stream'
import { recordSignatures } from './joint-signatures'
import { allowedTo, decoded } from './preconditions'
import { takenPositionRead } from './publish-joint-declaration'
import { ContributorIdentity } from './types'

const TakeJointPositionInput = S.Struct({
  declarationId: S.String,
  positionId: S.String,
  quote: S.Trim,
})

/** What the form sends to say a text takes one more position */
export type NewJointPosition = S.Schema.Encoded<typeof TakeJointPositionInput>

type TakeJointPositionParams = NewJointPosition & {
  contributor: ContributorIdentity | null
}

/**
 * Records that a joint declaration takes one more position, on a subject it
 * engaged already or on another. Every
 * signatory signed the whole text, so each of them takes the new position in
 * the same transaction, as a statement of their own. Nothing is earned: the
 * signatures were rewarded when they were found.
 */
export function takeJointPositionUseCase(params: TakeJointPositionParams) {
  const { contributor: asking, ...fields } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(asking, 'add_joint_declaration', 'compléter une déclaration commune'),
      input: decoded(TakeJointPositionInput)(fields),
    }),
    Effect.bind('taken', ({ input }) =>
      takenPositionRead(input, { quote: 'quote', position: 'positionId' }),
    ),
    Effect.flatMap(({ contributor, input, taken }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnJointDeclaration(
            events,
            input.declarationId,
            contributor.id,
            takePosition(taken),
          ),
          Effect.tap(({ state }) =>
            recordSignatures(
              events,
              contributor.id,
              state.signatories.map((signatory) => signatureOf(state, signatory, taken)),
            ),
          ),
          Effect.map(({ state }) => state.declaration),
        ),
      ),
    ),
  )
}
