import { Effect, pipe } from 'effect'
import { StatementAuthor, StatementId } from '../entities/statement'
import { addStatement } from '../aggregates/statement'
import { runUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import {
  statementContent,
  StatementContentInput,
  statementFields,
} from './validate-statement-fields'
import {
  ARGUMENT_JUST_CREATED,
  argumentRewards,
  recordProposedArguments,
  StatementArgumentsInput,
  validateStatementArguments,
} from './statement-arguments'
import { grantEach, rewardFor } from './reward'
import { openStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { statementAggregate } from './statement-stream'

type CreateStatementParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  author: StatementAuthor
  positionId: string
  /** Arguments the statement mobilises, chosen or proposed (Éloquent only) */
  arguments: StatementArgumentsInput
  /** What the statement carries, as the form holds it, read according to its type */
  content: StatementContentInput
  sourceName: string
  sourceUrl: string
  statedAt: string
}

export type { FieldErrors }

/** Read side: the author and the position must exist, the position on the subject */
const positions = Effect.serviceFunctions(PositionRepository)
const figures = Effect.serviceFunctions(PublicFigureRepository)
const organisations = Effect.serviceFunctions(OrganisationRepository)

/** The author must exist; the message names what was looked for */
const authorKnown = (author: StatementAuthor) =>
  author.kind === 'organisation'
    ? Effect.flatMap(
        organisations.findById(author.id),
        found('L’organisation sélectionnée est introuvable.'),
      )
    : Effect.flatMap(
        figures.findById(author.id),
        found('La personnalité sélectionnée est introuvable.'),
      )

export function createStatementUseCase(params: CreateStatementParams) {
  const { subjectId, author, positionId } = params
  const { sourceName, sourceUrl, statedAt } = params
  // The command names the statement: the stream exists from its first event
  const id = StatementId.make(crypto.randomUUID())

  const positionOnSubject = pipe(
    positions.findById(positionId),
    Effect.flatMap(found('La position sélectionnée est introuvable.')),
    Effect.filterOrFail(
      (position) => position.subjectId === subjectId,
      () => new Rejected("La position sélectionnée n'appartient pas à ce sujet."),
    ),
  )

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_statement', 'ajouter une prise de position'),
      fields: statementFields({ sourceName, sourceUrl, statedAt }),
      content: statementContent(params.content),
    }),
    Effect.tap(() => authorKnown(author)),
    Effect.tap(() => positionOnSubject),
    Effect.bind('validated', ({ contributor }) =>
      validateStatementArguments(contributor, params.arguments),
    ),
    // The proposed arguments open their streams, and the rewards fall, in the statement's transaction
    Effect.flatMap(({ contributor, content, fields, validated }) =>
      runUnitOfWork((events) =>
        pipe(
          recordProposedArguments(events, contributor.id, validated),
          Effect.flatMap((recorded) =>
            pipe(
              openStream(
                statementAggregate,
                events,
                id,
                addStatement({
                  author,
                  subjectId,
                  positionId,
                  content,
                  sourceName: fields.sourceName,
                  sourceUrl: fields.sourceUrl,
                  statedAt: new Date(fields.statedAt),
                  argumentIds: recorded.argumentIds,
                }),
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
    ),
    uniqueTakenAs('arguments', ARGUMENT_JUST_CREATED),
    Effect.map(({ state }) => state.statement),
  )
}
