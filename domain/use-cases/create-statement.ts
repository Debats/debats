import { Either, Effect, pipe } from 'effect'
import { Statement, StatementAuthor, StatementId, StatementType } from '../entities/statement'
import { addStatement } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { validateStatementFields } from './validate-statement-fields'
import {
  ARGUMENT_JUST_CREATED,
  argumentRewards,
  recordProposedArguments,
  StatementArgumentsInput,
  validateStatementArguments,
} from './statement-arguments'
import { grantEach, rewardFor } from './reward'
import { openStream } from './aggregate-stream'
import { runFormCommand, uniqueTakenAs } from './run-command'
import { statementAggregate } from './statement-stream'

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

  // The command names the statement: the stream exists from its first event
  const id = StatementId.make(crypto.randomUUID())
  const added = (argumentIds: readonly string[]) =>
    addStatement({
      author,
      subjectId,
      positionId,
      statementType,
      sourceName,
      sourceUrl: sourceUrl || undefined,
      quote,
      statedAt: new Date(statedAt),
      argumentIds,
    })

  // The proposed arguments open their streams, and the rewards fall, in the statement's transaction
  const outcome = await runFormCommand(
    pipe(
      runUnitOfWork((events) =>
        pipe(
          recordProposedArguments(events, contributor.id, validatedArguments.right),
          Effect.flatMap((recorded) =>
            pipe(
              openStream(
                statementAggregate,
                events,
                id,
                [added(recorded.argumentIds)],
                contributor.id,
              ),
              Effect.tap(() =>
                grantEach(events, contributor.id, [
                  rewardFor(contributor.id, 'added_statement_validated', {
                    relatedEntityType: 'statement',
                    relatedEntityId: id,
                  }),
                  ...argumentRewards(contributor.id, recorded),
                ]),
              ),
            ),
          ),
        ),
      ),
      uniqueTakenAs('arguments', ARGUMENT_JUST_CREATED),
    ),
  )

  return Either.map(outcome, (state) => state.statement)
}
