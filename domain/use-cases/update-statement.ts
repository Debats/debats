import { Either, Effect, pipe } from 'effect'
import { Statement, StatementType } from '../entities/statement'
import { editStatement, staysOnItsSubject } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { validateStatementFields } from './validate-statement-fields'
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

export async function updateStatementUseCase(
  params: UpdateStatementParams,
): Promise<Either.Either<Statement, string | FieldErrors>> {
  const {
    contributor,
    statementId,
    positionId,
    statementType,
    sourceName,
    sourceUrl,
    quote,
    statedAt,
    runUnitOfWork,
    statementSource,
    positionRepo,
    argumentRepo,
  } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'edit_statement')) {
    const rank = requiredRank('edit_statement')
    return Either.left(`Vous devez être ${rank} pour modifier une prise de position.`)
  }

  const validationError = validateStatementFields({ sourceName, sourceUrl, quote, statedAt })
  if (validationError) {
    return Either.left(validationError)
  }

  const parts = await Effect.runPromise(statementSource(statementId))
  if (!parts) {
    return Either.left('Prise de position introuvable.')
  }
  const existing = parts.statement

  const newPosition = await Effect.runPromise(positionRepo.findById(positionId))
  if (!newPosition) {
    return Either.left('La position sélectionnée est introuvable.')
  }

  // The stream decides this below; the tables answer for the streams opened before they said their subject
  if (positionId !== existing.positionId) {
    const currentPosition = await Effect.runPromise(positionRepo.findById(existing.positionId))
    if (!currentPosition || newPosition.subjectId !== currentPosition.subjectId) {
      return Either.left(OTHER_SUBJECT)
    }
  }

  const validatedArguments = await validateStatementArguments({
    contributor,
    input: params.arguments,
    argumentRepo,
  })
  if (Either.isLeft(validatedArguments)) {
    return Either.left(validatedArguments.left)
  }

  const edited = (argumentIds: readonly string[]) =>
    editStatement({
      positionId,
      statementType,
      sourceName,
      sourceUrl: sourceUrl || undefined,
      quote,
      statedAt: new Date(statedAt),
      argumentIds,
    })

  // The proposed arguments open their streams, and the rewards fall, in the edit's transaction
  const outcome = await runFormCommand(
    pipe(
      ensureStream(statementAggregate, runUnitOfWork, statementId, statementSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            recordProposedArguments(events, contributor.id, validatedArguments.right),
            Effect.flatMap((recorded) =>
              pipe(
                decideOnStatement(
                  events,
                  statementId,
                  contributor.id,
                  (state) =>
                    staysOnItsSubject(state, newPosition.subjectId)
                      ? Effect.succeed([edited(recorded.argumentIds)])
                      : Effect.fail(new Rejected(OTHER_SUBJECT, 'positionId')),
                  params.revision,
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
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  return Either.right(outcome.right.state.statement)
}
