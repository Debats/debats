import { Effect, Either, pipe } from 'effect'
import * as S from 'effect/Schema'
import {
  hasSigned,
  JointDeclarationState,
  signatoryAdded,
  signatureOf,
  TakenPosition,
} from '../aggregates/joint-declaration'
import { joinJointDeclaration, removeStatement } from '../aggregates/statement'
import { Statement, StatementAuthor } from '../entities/statement'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { decideOnJointDeclaration } from './joint-declaration-stream'
import { recordSignatures } from './joint-signatures'
import { allowedTo, decoded, found } from './preconditions'
import { decideOnEachStatement, decideOnStatement } from './statement-stream'
import { ContributorIdentity, Rejected } from './types'

const AttachmentInput = S.Struct({
  declarationId: S.String,
  /** The statements of one author that are their signature of the text, one per position at most */
  statementIds: S.Array(S.String).pipe(S.minItems(1)),
})

/** What the form sends to say statements already on the site are the signature of a text */
export type NewAttachment = S.Schema.Encoded<typeof AttachmentInput>

type AttachParams = NewAttachment & { contributor: ContributorIdentity | null }

export const ATTACHED_STATEMENT_NOT_FOUND = 'Une des prises de position est introuvable.'
export const SEVERAL_SIGNATORIES =
  'Les prises de position à rattacher doivent être celles d’un·e même signataire.'
export const SAME_POSITION_TWICE =
  'Deux des prises de position à rattacher portent la même position : une signature n’en fait qu’une par position.'
export const TEXT_SILENT_ON_POSITION =
  'La déclaration commune ne prend pas la position d’une de ces prises de position. Ajoutez d’abord cette position au texte.'

/** Read side: the statements to attach, what the text holds, and what a signature already made */
const statements = Effect.serviceFunctions(StatementRepository)
const declarations = Effect.serviceFunctions(JointDeclarationRepository)

const sameAuthor = (a: StatementAuthor, b: StatementAuthor) => a.kind === b.kind && a.id === b.id

/** The statements named, all found, all of one author, each on a position of its own */
const attachedRead = (statementIds: readonly string[]) =>
  pipe(
    Effect.forEach(statementIds, (id) =>
      Effect.flatMap(statements.findById(id), found(ATTACHED_STATEMENT_NOT_FOUND)),
    ),
    Effect.filterOrFail(
      (attached) => attached.every(({ author }) => sameAuthor(author, attached[0].author)),
      () => new Rejected(SEVERAL_SIGNATORIES),
    ),
    Effect.filterOrFail(
      (attached) => new Set(attached.map((s) => s.positionId)).size === attached.length,
      () => new Rejected(SAME_POSITION_TWICE),
    ),
  )

/** A statement an earlier signature of the author made, and the position of the text it stands on */
type Signed = { positionId: string; statementId: string }

/**
 * What an earlier signature of this author already holds of the text: empty
 * for who signs now, and for who signed a text since completed.
 */
const signedRead = (declarationId: string, signatory: StatementAuthor) =>
  pipe(
    declarations.findHeld(declarationId),
    Effect.flatMap((held) =>
      Effect.forEach(held.positions, ({ positionId }) =>
        Effect.map(
          statements.findSignatureId(declarationId, signatory, positionId),
          (statementId): Signed[] => (statementId === null ? [] : [{ positionId, statementId }]),
        ),
      ),
    ),
    Effect.map((signed) => signed.flat()),
  )

const standsOn = (attached: Statement[], positionId: string) =>
  attached.some((statement) => statement.positionId === positionId)

/** The position of the text an attached statement stands on, or the refusal: the text must take it */
const takenBy = (state: JointDeclarationState, statement: Statement) =>
  pipe(
    state.positions.find((taken) => taken.positionId === statement.positionId),
    Effect.fromNullable,
    Effect.mapError(() => new Rejected(TEXT_SILENT_ON_POSITION)),
  )

/**
 * The positions of the text the signatory does not hold yet: neither by an
 * attached statement, nor by a statement an earlier signature made.
 */
const leftToSign = (
  state: JointDeclarationState,
  attached: Statement[],
  signed: readonly Signed[],
): TakenPosition[] =>
  state.positions.filter(
    ({ positionId }) =>
      !standsOn(attached, positionId) && !signed.some((held) => held.positionId === positionId),
  )

function attachedIn(
  events: EventStore,
  actorId: string,
  declarationId: string,
  attached: Statement[],
  signed: readonly Signed[],
) {
  const signatory = attached[0].author
  /*
   * A signatory holds each position of the text once: where an earlier
   * signature made a statement, the one attached takes its place.
   */
  const replacedIds = signed
    .filter(({ positionId }) => standsOn(attached, positionId))
    .map(({ statementId }) => statementId)
    // A statement that is already a signature is refused by its own stream, never removed for itself
    .filter((statementId) => !attached.some((statement) => statement.id === statementId))

  return pipe(
    // The author is among the signatories: already, or from now on
    decideOnJointDeclaration(events, declarationId, actorId, (state) =>
      Either.right(hasSigned(state, signatory) ? [] : [signatoryAdded(signatory)]),
    ),
    Effect.tap(() => decideOnEachStatement(events, replacedIds, actorId, removeStatement())),
    Effect.tap(({ state }) =>
      Effect.forEach(
        attached,
        (statement) =>
          Effect.flatMap(takenBy(state, statement), (taken) =>
            decideOnStatement(
              events,
              statement.id,
              actorId,
              joinJointDeclaration(signatureOf(state, signatory, taken)),
            ),
          ),
        { discard: true },
      ),
    ),
    Effect.tap(({ state }) =>
      recordSignatures(
        events,
        actorId,
        leftToSign(state, attached, signed).map((taken) => signatureOf(state, signatory, taken)),
      ),
    ),
    Effect.map(({ state }) => ({ declaration: state.declaration, signatory })),
  )
}

/**
 * Says that statements already on the site are their author's signature of a
 * joint declaration, written before the site knew the text. Each becomes the
 * signature the text makes on its position: it takes the words, the source
 * and the day of the text, and keeps its arguments. Signing is signing the
 * whole text, so the author joins the signatories and takes the other
 * positions of the text as new statements — all in one transaction.
 *
 * It rewrites statements, so it takes who may edit one. Nothing is earned:
 * the statements were rewarded when they were added.
 */
export function attachToJointDeclarationUseCase(params: AttachParams) {
  const { contributor: asking, ...fields } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(asking, 'edit_statement', 'rattacher une prise de position'),
      input: decoded(AttachmentInput)(fields),
    }),
    Effect.bind('attached', ({ input }) => attachedRead(input.statementIds)),
    Effect.bind('signed', ({ input, attached }) =>
      signedRead(input.declarationId, attached[0].author),
    ),
    Effect.flatMap(({ contributor, input, attached, signed }) =>
      runUnitOfWork((events) =>
        attachedIn(events, contributor.id, input.declarationId, attached, signed),
      ),
    ),
  )
}
