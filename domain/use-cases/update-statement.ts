import { Either, Effect, pipe } from 'effect'
import { Statement, StatementType } from '../entities/statement'
import { editStatement, statementStream } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { StatementRepository } from '../repositories/statement-repository'
import { PositionRepository } from '../repositories/position-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { validateStatementFields } from './validate-statement-fields'
import {
  createProposedArguments,
  rewardArgumentLinks,
  StatementArgumentsInput,
  validateStatementArguments,
} from './statement-arguments'
import { appendToStatement, loadOrImportStatement } from './statement-stream'

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
  statementRepo: StatementRepository
  positionRepo: PositionRepository
  argumentRepo: ArgumentRepository
  reputationRepo: ReputationRepository
}

export type { FieldErrors }

export const EDITED_MEANWHILE =
  'Cette prise de position vient d’être modifiée par quelqu’un d’autre. Rechargez la page avant de la modifier.'

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
    statementRepo,
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

  const existing = await Effect.runPromise(statementRepo.findById(statementId))
  if (!existing) {
    return Either.left('Prise de position introuvable.')
  }

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

  const argumentIds = await createProposedArguments({
    contributor,
    validated: validatedArguments.right,
    argumentRepo,
    reputationRepo,
  })

  const currentArguments = await Effect.runPromise(argumentRepo.findRefsByStatementId(statementId))
  const edited = editStatement({
    positionId,
    statementType,
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    statedAt: new Date(statedAt),
    argumentIds,
  })

  const outcome = await Effect.runPromise(
    Effect.either(
      runUnitOfWork((events) =>
        pipe(
          loadOrImportStatement(
            events,
            existing,
            currentArguments.map((a) => a.id),
          ),
          Effect.flatMap((history) =>
            appendToStatement(
              events,
              statementStream(existing.id),
              history,
              [edited],
              contributor.id,
            ),
          ),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) {
    if (outcome.left._tag === 'ConcurrencyError') return Either.left(EDITED_MEANWHILE)
    throw outcome.left
  }

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'edited_statement',
      amount: reputationReward('edited_statement'),
      relatedEntityType: 'statement',
      relatedEntityId: outcome.right.statement.id,
    }),
  )

  await rewardArgumentLinks({ contributor, argumentIds, reputationRepo })

  return Either.right(outcome.right.statement)
}
