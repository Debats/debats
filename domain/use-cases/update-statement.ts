import { Either, Effect, pipe } from 'effect'
import { Statement, StatementType } from '../entities/statement'
import { editStatement } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { validateStatementFields } from './validate-statement-fields'
import {
  recordProposedArguments,
  rewardArguments,
  StatementArgumentsInput,
  validateStatementArguments,
} from './statement-arguments'
import { appendToStatement, loadOrImportStatement, StatementSource } from './statement-stream'
import { runCommand } from './run-command'

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
  runUnitOfWork: RunUnitOfWork
  /** Read side: the statement as projected, to find it and to import it on demand */
  statementSource: StatementSource
  positionRepo: PositionRepository
  argumentRepo: ArgumentRepository
  reputationRepo: ReputationRepository
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
    reputationRepo,
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

  if (positionId !== existing.positionId) {
    const currentPosition = await Effect.runPromise(positionRepo.findById(existing.positionId))
    if (currentPosition && newPosition.subjectId !== currentPosition.subjectId) {
      return Either.left('La nouvelle position doit appartenir au même sujet.')
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

  // The proposed arguments open their streams in the same transaction as the edit
  const outcome = await runCommand(
    runUnitOfWork((events) =>
      pipe(
        recordProposedArguments(events, contributor.id, validatedArguments.right),
        Effect.flatMap((recorded) =>
          pipe(
            loadOrImportStatement(events, statementId, statementSource),
            Effect.flatMap((history) =>
              appendToStatement(
                events,
                statementId,
                history,
                [edited(recorded.argumentIds)],
                contributor.id,
              ),
            ),
            Effect.map((state) => ({ state, recorded })),
          ),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)
  const { state, recorded } = outcome.right

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'edited_statement',
      amount: reputationReward('edited_statement'),
      relatedEntityType: 'statement',
      relatedEntityId: state.statement.id,
    }),
  )

  await rewardArguments({ contributor, recorded, reputationRepo })

  return Either.right(state.statement)
}
