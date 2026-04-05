import { Either } from 'effect'
import { Effect } from 'effect'
import { updateStatement, Statement, StatementType } from '../entities/statement'
import { StatementRepository } from '../repositories/statement-repository'
import { PositionRepository } from '../repositories/position-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
import { validateStatementFields } from './validate-statement-fields'

type UpdateStatementParams = {
  contributor: ContributorIdentity | null
  statementId: string
  positionId: string
  statementType: StatementType
  sourceName: string
  sourceUrl: string
  quote: string
  statedAt: string
  statementRepo: StatementRepository
  positionRepo: PositionRepository
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
    statementRepo,
    positionRepo,
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

  const updated = updateStatement(
    { ...existing, positionId },
    {
      statementType,
      sourceName,
      sourceUrl: sourceUrl || undefined,
      quote,
      statedAt: new Date(statedAt),
    },
  )

  const saved = await Effect.runPromise(statementRepo.update(updated))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'edited_statement',
      amount: reputationReward('edited_statement'),
      relatedEntityType: 'statement',
      relatedEntityId: saved.id,
    }),
  )

  return Either.right(saved)
}
