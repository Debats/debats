import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { createPosition, Position } from '../entities/position'
import { createStatement, createEvidence } from '../entities/statement'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'

const CreatePositionWithStatementInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
  sourceName: S.String.pipe(S.minLength(1)),
  sourceUrl: S.optional(S.String),
  quote: S.String.pipe(S.minLength(10)),
  factDate: S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/)),
})

type Contributor = { id: string; reputation: number }

type CreatePositionWithStatementParams = {
  contributor: Contributor | null
  subjectId: string
  publicFigureId: string
  title: string
  description: string
  sourceName: string
  sourceUrl: string
  quote: string
  factDate: string
  positionRepo: PositionRepository
  statementRepo: StatementRepository
  subjectRepo: SubjectRepository
  publicFigureRepo: PublicFigureRepository
  reputationRepo: ReputationRepository
}

export type FieldErrors = Record<string, string>

export async function createPositionWithStatementUseCase(
  params: CreatePositionWithStatementParams,
): Promise<Either.Either<Position, string | FieldErrors>> {
  const {
    contributor,
    subjectId,
    publicFigureId,
    title,
    description,
    sourceName,
    sourceUrl,
    quote,
    factDate,
    positionRepo,
    statementRepo,
    subjectRepo,
    publicFigureRepo,
    reputationRepo,
  } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_position')) {
    const rank = requiredRank('add_position')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle position.`)
  }

  const decoded = S.decodeUnknownEither(CreatePositionWithStatementInput, { errors: 'all' })({
    title,
    description,
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
      if (field === 'title') {
        fieldErrors.title = 'Le titre doit faire entre 3 et 255 caractères.'
      } else if (field === 'description') {
        fieldErrors.description = 'La description doit faire au moins 10 caractères.'
      } else if (field === 'sourceName') {
        fieldErrors.sourceName = 'Le nom de la source est requis.'
      } else if (field === 'quote') {
        fieldErrors.quote = 'La citation doit faire au moins 10 caractères.'
      } else if (field === 'factDate') {
        fieldErrors.factDate = 'La date du fait est invalide (format attendu : AAAA-MM-JJ).'
      }
    }
    return Either.left(Object.keys(fieldErrors).length > 0 ? fieldErrors : 'Données invalides.')
  }

  const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
  if (!subject) {
    return Either.left('Le sujet sélectionné est introuvable.')
  }

  const publicFigure = await Effect.runPromise(publicFigureRepo.findById(publicFigureId))
  if (!publicFigure) {
    return Either.left('La personnalité sélectionnée est introuvable.')
  }

  const position = createPosition({
    title,
    description,
    subjectId,
    createdBy: contributor.id,
  })

  const createdPosition = await Effect.runPromise(positionRepo.create(position))

  const statement = createStatement({
    publicFigureId,
    positionId: createdPosition.id,
    createdBy: contributor.id,
  })

  await Effect.runPromise(statementRepo.create(statement))

  const evidence = createEvidence({
    statementId: statement.id,
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    factDate: new Date(factDate),
    createdBy: contributor.id,
  })

  await Effect.runPromise(statementRepo.createEvidence(evidence))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_position_validated',
      amount: reputationReward('added_position_validated'),
      relatedEntityType: 'position',
      relatedEntityId: createdPosition.id,
    }),
  )
  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_statement_validated',
      amount: reputationReward('added_statement_validated'),
      relatedEntityType: 'statement',
      relatedEntityId: statement.id,
    }),
  )

  return Either.right(createdPosition)
}
