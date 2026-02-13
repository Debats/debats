import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { createStatement, createEvidence, Statement } from '../entities/statement'
import { StatementRepository } from '../repositories/statement-repository'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'

const CreateStatementInput = S.Struct({
  sourceName: S.String.pipe(S.minLength(1)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  factDate: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

type Contributor = { id: string; reputation: number }

type CreateStatementParams = {
  contributor: Contributor | null
  subjectId: string
  publicFigureId: string
  positionId: string
  sourceName: string
  sourceUrl: string
  quote: string
  factDate: string
  statementRepo: StatementRepository
  positionRepo: PositionRepository
  publicFigureRepo: PublicFigureRepository
  reputationRepo: ReputationRepository
}

export type FieldErrors = Record<string, string>

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
    factDate,
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
    factDate,
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
      } else if (field === 'factDate') {
        fieldErrors.factDate = 'La date du fait est invalide (format attendu : AAAA-MM-JJ).'
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
    createdBy: contributor.id,
  })

  const evidence = createEvidence({
    statementId: statement.id,
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    factDate: new Date(factDate),
    createdBy: contributor.id,
  })

  const created = await Effect.runPromise(statementRepo.create(statement))
  await Effect.runPromise(statementRepo.createEvidence(evidence))

  await Effect.runPromise(
    reputationRepo.addReputation(contributor.id, reputationReward('added_statement_validated')),
  )

  return Either.right(created)
}
