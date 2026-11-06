import { Effect, pipe } from 'effect'
import { StatementAuthor, StatementId } from '../entities/statement'
import { addStatement } from '../aggregates/statement'
import { runUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { today } from './today'
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
import {
  chosenPositionField,
  InlinePosition,
  inlinePositionFields,
  POSITION_TITLE_TAKEN,
  positionReward,
  recordNewPosition,
} from './create-position'
import { grantEach, rewardFor } from './reward'
import { openStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { statementAggregate } from './statement-stream'

/**
 * The position the statement defends: one already on the subject, or one the
 * form opens in the same breath. Never both, never neither — which is why it
 * is a union and not two optional fields.
 */
export type StatementPositionInput =
  | { kind: 'existing'; id: string }
  | ({ kind: 'new' } & InlinePosition)

type CreateStatementParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  author: StatementAuthor
  position: StatementPositionInput
  /** Arguments the statement mobilises, chosen or proposed (Éloquent only) */
  arguments: StatementArgumentsInput
  /** What the statement carries, as the form holds it, read according to its type */
  content: StatementContentInput
  sourceName: string
  sourceUrl: string
  statedAt: string
}

/**
 * What the contribution form sends: the command's own input, minus who is
 * contributing, which the action reads from the session. A field added to the
 * command is a field the client no longer compiles without.
 */
export type NewStatement = Omit<CreateStatementParams, 'contributor'>

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
  const { subjectId, author, position } = params
  const { sourceName, sourceUrl, statedAt } = params
  // The command names the statement: the stream exists from its first event
  const id = StatementId.make(crypto.randomUUID())

  /** A position already on the subject: it must exist, and be one of its own */
  const positionOnSubject = (positionId: string) =>
    pipe(
      positions.findById(positionId),
      Effect.flatMap(found('La position sélectionnée est introuvable.')),
      Effect.filterOrFail(
        (candidate) => candidate.subjectId === subjectId,
        () => new Rejected("La position sélectionnée n'appartient pas à ce sujet."),
      ),
    )

  /**
   * Which position the statement will hang on, settled before anything is
   * written: either one read from the tables, or the fields of one to open.
   * Opening a position is its own right, so it is asked for here.
   */
  const positionSettled =
    position.kind === 'new'
      ? pipe(
          allowedTo(params.contributor, 'add_position', 'proposer une nouvelle position'),
          Effect.andThen(inlinePositionFields(position)),
          Effect.map((toOpen) => ({ kind: 'new', toOpen }) as const),
        )
      : pipe(
          chosenPositionField(position.id),
          Effect.andThen(positionOnSubject(position.id)),
          Effect.as({ kind: 'existing', id: position.id } as const),
        )

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_statement', 'ajouter une prise de position'),
      fields: Effect.flatMap(today, (day) =>
        statementFields({ sourceName, sourceUrl, statedAt }, day),
      ),
      content: statementContent(params.content),
      position: positionSettled,
    }),
    Effect.tap(() => authorKnown(author)),
    Effect.bind('validated', ({ contributor }) =>
      validateStatementArguments(contributor, params.arguments),
    ),
    /*
     * One transaction for the whole contribution: the proposed arguments open
     * their streams, a new position lands on its subject, the statement opens
     * its own, and every reward falls — together, or not at all.
     */
    Effect.flatMap(({ contributor, content, fields, position: settled, validated }) =>
      runUnitOfWork((events) =>
        pipe(
          /*
           * Each write that can hit a unique constraint names its own field:
           * one mapping for the whole command would report a position title
           * already taken under the arguments field.
           */
          pipe(
            recordProposedArguments(events, contributor.id, validated),
            uniqueTakenAs('arguments', ARGUMENT_JUST_CREATED),
          ),
          Effect.bindTo('recorded'),
          Effect.bind('positionId', () =>
            settled.kind === 'new'
              ? pipe(
                  recordNewPosition(events, subjectId, contributor.id, settled.toOpen),
                  Effect.map((opened) => opened.id),
                  uniqueTakenAs('positionTitle', POSITION_TITLE_TAKEN),
                )
              : Effect.succeed(settled.id),
          ),
          Effect.flatMap(({ recorded, positionId }) =>
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
                  ...(settled.kind === 'new' ? [positionReward(contributor.id, positionId)] : []),
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
    Effect.map(({ state }) => state.statement),
  )
}
