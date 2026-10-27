import { Either, Effect, pipe } from 'effect'
import { Position } from '../entities/position'
import { Statement, StatementType } from '../entities/statement'
import { editStatement, staysOnItsSubject } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { ArgumentRepository } from '../repositories/argument-repository'
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
import { runFormCommand, uniqueTakenAs } from './run-command'

const OTHER_SUBJECT = 'La nouvelle position doit appartenir au même sujet.'

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
  runUnitOfWork: RunUnitOfWork
  /** Read side: the statement as projected, to find it and to import it on demand */
  statementSource: StatementSource
  positionRepo: PositionRepository
  argumentRepo: ArgumentRepository
}

export type { FieldErrors }

export function updateStatementUseCase(
  params: UpdateStatementParams,
): Promise<Either.Either<Statement, string | FieldErrors>> {
  const { statementId, positionId, statementType, revision, runUnitOfWork } = params
  const { sourceName, sourceUrl, quote, statedAt, statementSource, positionRepo } = params

  // The stream decides this below; the tables answer for the streams opened before they said their subject
  const onTheSameSubject = (existing: Statement, newPosition: Position) =>
    positionId === existing.positionId
      ? Effect.void
      : Effect.filterOrFail(
          positionRepo.findById(existing.positionId),
          (current) => current !== null && current.subjectId === newPosition.subjectId,
          () => new Rejected(OTHER_SUBJECT),
        )

  return runFormCommand(
    pipe(
      Effect.all({
        contributor: allowedTo(
          params.contributor,
          'edit_statement',
          'modifier une prise de position',
        ),
        fields: statementFields({ sourceName, sourceUrl, quote, statedAt }),
        existing: Effect.map(
          Effect.flatMap(statementSource(statementId), found(statementAggregate.notFound)),
          (parts) => parts.statement,
        ),
        newPosition: Effect.flatMap(
          positionRepo.findById(positionId),
          found('La position sélectionnée est introuvable.'),
        ),
      }),
      Effect.tap(({ existing, newPosition }) => onTheSameSubject(existing, newPosition)),
      Effect.bind('validated', ({ contributor }) =>
        validateStatementArguments({
          contributor,
          input: params.arguments,
          argumentRepo: params.argumentRepo,
        }),
      ),
      Effect.tap(() =>
        ensureStream(statementAggregate, runUnitOfWork, statementId, statementSource),
      ),
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
                  (state) =>
                    staysOnItsSubject(state, newPosition.subjectId)
                      ? Effect.succeed([
                          editStatement({
                            positionId,
                            statementType,
                            sourceName: fields.sourceName,
                            sourceUrl: fields.sourceUrl,
                            quote: fields.quote,
                            statedAt: new Date(fields.statedAt),
                            argumentIds: recorded.argumentIds,
                          }),
                        ])
                      : Effect.fail(new Rejected(OTHER_SUBJECT, 'positionId')),
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
    ),
  )
}
