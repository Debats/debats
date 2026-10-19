import { Either, Effect, pipe } from 'effect'
import { Statement, StatementAuthor, StatementId, StatementType } from '../entities/statement'
import { addStatement, replayStatement, statementStream } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
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
import { requireState } from './statement-stream'

type CreateStatementParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  author: StatementAuthor
  positionId: string
  /** Arguments the statement mobilises, chosen or proposed (Éloquent only) */
  arguments: StatementArgumentsInput
  statementType: StatementType
  sourceName: string
  sourceUrl: string
  quote: string
  statedAt: string
  runUnitOfWork: RunUnitOfWork
  positionRepo: PositionRepository
  publicFigureRepo: PublicFigureRepository
  organisationRepo: OrganisationRepository
  argumentRepo: ArgumentRepository
  reputationRepo: ReputationRepository
}

export type { FieldErrors }

/** The author must exist; the message names what was looked for. */
async function findAuthorError(
  author: StatementAuthor,
  publicFigureRepo: PublicFigureRepository,
  organisationRepo: OrganisationRepository,
): Promise<string | null> {
  if (author.kind === 'organisation') {
    const organisation = await Effect.runPromise(organisationRepo.findById(author.id))
    return organisation ? null : 'L’organisation sélectionnée est introuvable.'
  }
  const publicFigure = await Effect.runPromise(publicFigureRepo.findById(author.id))
  return publicFigure ? null : 'La personnalité sélectionnée est introuvable.'
}

export async function createStatementUseCase(
  params: CreateStatementParams,
): Promise<Either.Either<Statement, string | FieldErrors>> {
  const {
    contributor,
    subjectId,
    author,
    positionId,
    statementType,
    sourceName,
    sourceUrl,
    quote,
    statedAt,
    runUnitOfWork,
    positionRepo,
    publicFigureRepo,
    organisationRepo,
    argumentRepo,
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

  const authorError = await findAuthorError(author, publicFigureRepo, organisationRepo)
  if (authorError) {
    return Either.left(authorError)
  }

  const position = await Effect.runPromise(positionRepo.findById(positionId))
  if (!position) {
    return Either.left('La position sélectionnée est introuvable.')
  }

  if (position.subjectId !== subjectId) {
    return Either.left("La position sélectionnée n'appartient pas à ce sujet.")
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

  // The command names the statement: the stream exists from its first event
  const id = StatementId.make(crypto.randomUUID())
  const added = addStatement({
    author,
    positionId,
    statementType,
    sourceName,
    sourceUrl: sourceUrl || undefined,
    quote,
    statedAt: new Date(statedAt),
    argumentIds,
  })

  const state = await Effect.runPromise(
    runUnitOfWork((events) =>
      pipe(
        events.append(statementStream(id), 0, [added], { actorId: contributor.id }),
        Effect.flatMap(replayStatement),
        Effect.flatMap(requireState),
      ),
    ),
  )

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_statement_validated',
      amount: reputationReward('added_statement_validated'),
      relatedEntityType: 'statement',
      relatedEntityId: state.statement.id,
    }),
  )

  await rewardArgumentLinks({ contributor, argumentIds, reputationRepo })

  return Either.right(state.statement)
}
