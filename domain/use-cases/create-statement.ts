import { Either } from 'effect'
import { Effect } from 'effect'
import { createStatement, Statement, StatementType } from '../entities/statement'
import { StatementRepository } from '../repositories/statement-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
import { validateStatementFields } from './validate-statement-fields'

type CreateStatementParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  publicFigureId: string
  positionId: string
  statementType: StatementType
  sourceName: string
  sourceUrl: string
  quote: string
  statedAt: string
  statementRepo: StatementRepository
  positionRepo: PositionRepository
  publicFigureRepo: PublicFigureRepository
  reputationRepo: ReputationRepository
}

export type { FieldErrors }

export async function createStatementUseCase(
  params: CreateStatementParams,
): Promise<Either.Either<Statement, string | FieldErrors>> {
  const {
    contributor,
    subjectId,
    publicFigureId,
    positionId,
    statementType,
    sourceName,
    sourceUrl,
    quote,
    statedAt,
    statementRepo,
    positionRepo,
    publicFigureRepo,
    reputationRepo,
  } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_statement')) {
    const rank = requiredRank('add_statement')
    return Either.left(`Vous devez être ${rank} pour ajouter une prise de position.`)
  }

  const validationError = validateStatementFields({ sourceName, sourceUrl, quote, statedAt })
  if (validationError) {
    return Either.left(validationError)
  }

  const publicFigure = await Effect.runPromise(publicFigureRepo.findById(publicFigureId))
  if (!publicFigure) {
    return Either.left('La personnalité sélectionnée est introuvable.')
  }

  const position = await Effect.runPromise(positionRepo.findById(positionId))
  if (!position) {
    return Either.left('La position sélectionnée est introuvable.')
  }

  if (position.subjectId !== subjectId) {
    return Either.left("La position sélectionnée n'appartient pas à ce sujet.")
  }

  const statement = createStatement({
    publicFigureId,
    positionId,
    statementType,
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    statedAt: new Date(statedAt),
    createdBy: contributor.id,
  })

  const created = await Effect.runPromise(statementRepo.create(statement))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_statement_validated',
      amount: reputationReward('added_statement_validated'),
      relatedEntityType: 'statement',
      relatedEntityId: created.id,
    }),
  )

  return Either.right(created)
}
