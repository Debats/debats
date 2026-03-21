import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { createStatement, Statement } from '../entities/statement'
import { StatementRepository } from '../repositories/statement-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

const CreateStatementInput = S.Struct({
  sourceName: S.String.pipe(S.minLength(1)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  statedAt: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

type CreateStatementParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  publicFigureId: string
  positionId: string
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

  const decoded = S.decodeUnknownEither(CreateStatementInput)({
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    statedAt,
  })

  if (Either.isLeft(decoded)) {
    const issues = ArrayFormatter.formatErrorSync(decoded.left)
    const fieldErrors: FieldErrors = {}
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'sourceName') {
        fieldErrors.sourceName = 'Le nom de la source est requis.'
      } else if (field === 'quote') {
        fieldErrors.quote = 'La citation doit faire au moins 10 caractères.'
      } else if (field === 'statedAt') {
        fieldErrors.statedAt = 'La date de la déclaration est invalide (format attendu : AAAA-MM-JJ).'
      }
    }
    return Either.left(Object.keys(fieldErrors).length > 0 ? fieldErrors : 'Données invalides.')
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
