import { Effect, pipe } from 'effect'
import { Position } from '../entities/position'
import { Statement, StatementType } from '../entities/statement'
import { editStatement, OTHER_SUBJECT } from '../aggregates/statement'
import { runUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { statementFields } from './validate-statement-fields'
import {
  ARGUMENT_JUST_CREATED,
  argumentRewards,
  recordProposedArguments,
  StatementArgumentsInput,
  validateStatementArguments,
} from './statement-arguments'
import { grantEach, rewardFor } from './reward'
import { decideOnStatement, statementAggregate, StatementSource } from './statement-stream'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { uniqueTakenAs } from './run-command'

type UpdateStatementParams = {
  contributor: ContributorIdentity | null
  statementId: string
  positionId: string
  /** The full set of arguments the statement mobilises after the edit (Éloquent only) */
  arguments: StatementArgumentsInput
  statementType: StatementType
  sourceName: string
  sourceUrl: string
  quote: string
  statedAt: string
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
}

export type { FieldErrors }

/** Read side: the new position must exist; the statement as projected, to find it */
const positions = Effect.serviceFunctions(PositionRepository)

export function updateStatementUseCase(params: UpdateStatementParams) {
  const { statementId, positionId, statementType, revision } = params
  const { sourceName, sourceUrl, quote, statedAt } = params

  // The stream decides this below; the tables answer for the streams opened before they said their subject
  const onTheSameSubject = (existing: Statement, newPosition: Position) =>
    positionId === existing.positionId
      ? Effect.void
      : Effect.filterOrFail(
          positions.findById(existing.positionId),
          (current) => current !== null && current.subjectId === newPosition.subjectId,
          () => new Rejected(OTHER_SUBJECT),
        )

  const existingStatement = pipe(
    Effect.flatMap(StatementSource, (source) => source(statementId)),
    Effect.flatMap(found(statementAggregate.notFound)),
    Effect.map((parts) => parts.statement),
  )

  return pipe(
    Effect.all({
      contributor: allowedTo(
        params.contributor,
        'edit_statement',
        'modifier une prise de position',
      ),
      fields: statementFields({ sourceName, sourceUrl, quote, statedAt }),
      existing: existingStatement,
      newPosition: Effect.flatMap(
        positions.findById(positionId),
        found('La position sélectionnée est introuvable.'),
      ),
    }),
    Effect.tap(({ existing, newPosition }) => onTheSameSubject(existing, newPosition)),
    Effect.bind('validated', ({ contributor }) =>
      validateStatementArguments(contributor, params.arguments),
    ),
    Effect.tap(() => ensureStream(statementAggregate, statementId)),
    // The proposed arguments open their streams, and the rewards fall, in the edit's transaction
    Effect.flatMap(({ contributor, fields, newPosition, validated }) =>
      runUnitOfWork((events) =>
        pipe(
          recordProposedArguments(events, contributor.id, validated),
          Effect.flatMap((recorded) =>
            pipe(
              decideOnStatement(
                events,
                statementId,
                contributor.id,
                editStatement(
                  {
                    positionId,
                    statementType,
                    sourceName: fields.sourceName,
                    sourceUrl: fields.sourceUrl,
                    quote: fields.quote,
                    statedAt: new Date(fields.statedAt),
                    argumentIds: recorded.argumentIds,
                  },
                  newPosition.subjectId,
                ),
                revision,
              ),
              Effect.tap(() =>
                grantEach(events, contributor.id, [
                  rewardFor(contributor.id, 'edited_statement', {
                    relatedEntityType: 'statement',
                    relatedEntityId: statementId,
                  }),
                  ...argumentRewards(contributor.id, recorded),
                ]),
              ),
            ),
          ),
        ),
      ),
    ),
    uniqueTakenAs('arguments', ARGUMENT_JUST_CREATED),
    Effect.map(({ state }) => state.statement),
  )
}
