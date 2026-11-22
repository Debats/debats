import { Effect, pipe } from 'effect'
import { addSignatory, signatureOf } from '../aggregates/joint-declaration'
import { runUnitOfWork } from '../events/unit-of-work'
import { authorIn, authorRewards, authorSettled, StatementAuthorInput } from './statement-author'
import { decideOnJointDeclaration } from './joint-declaration-stream'
import { recordSignatures } from './joint-signatures'
import { allowedTo } from './preconditions'
import { grantEach, rewardFor } from './reward'
import { ContributorIdentity } from './types'

/**
 * What the form sends to add a signature: which text, and who signed it — a
 * personality or an organisation of the site, or one the form opens in the
 * same breath, as for any statement.
 */
export type NewSignature = {
  declarationId: string
  author: StatementAuthorInput
}

type SignJointDeclarationParams = NewSignature & {
  contributor: ContributorIdentity | null
}

/**
 * Records that a personality or an organisation signed a joint declaration.
 * Signing is signing the whole text: the signatory takes each position the
 * text takes, as one statement per position, in the transaction that records
 * the signature. The contributor earns one statement's worth, whatever the
 * number of positions: what was found is one signature. A signatory opened
 * here earns what opening it earns anywhere.
 */
export function signJointDeclarationUseCase(params: SignJointDeclarationParams) {
  const { declarationId } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_statement', 'ajouter une signature'),
      author: authorSettled(params.author, params.contributor),
    }),
    Effect.flatMap((settled) =>
      runUnitOfWork((events) =>
        pipe(
          authorIn(events, settled.contributor.id, settled.author),
          Effect.bindTo('signatory'),
          Effect.bind('signed', ({ signatory }) =>
            decideOnJointDeclaration(
              events,
              declarationId,
              settled.contributor.id,
              addSignatory(signatory),
            ),
          ),
          Effect.bind('statements', ({ signatory, signed: { state } }) =>
            recordSignatures(
              events,
              settled.contributor.id,
              state.positions.map((taken) => signatureOf(state, signatory, taken)),
            ),
          ),
          Effect.tap(({ signatory, statements }) =>
            grantEach(events, settled.contributor.id, [
              ...authorRewards(settled.contributor.id, settled.author, signatory.id),
              rewardFor(settled.contributor.id, 'added_statement_validated', {
                relatedEntityType: 'statement',
                relatedEntityId: statements[0].id,
              }),
            ]),
          ),
          Effect.map(({ signatory, signed: { state }, statements }) => ({
            declaration: state.declaration,
            signatory,
            statements,
          })),
        ),
      ),
    ),
  )
}
