import { Effect, pipe } from 'effect'
import {
  organisationAuthor,
  publicFigureAuthor,
  StatementAuthor,
  StatementId,
} from '../entities/statement'
import { addStatement } from '../aggregates/statement'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { DatabaseError } from '../repositories/errors'
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
  inlineSubjectChecked,
  NewSubject,
  recordNewSubject,
  SUBJECT_TITLE_TAKEN,
  subjectReward,
} from './create-subject'
import {
  chosenPositionField,
  InlinePosition,
  inlinePositionFields,
  POSITION_TITLE_TAKEN,
  positionReward,
  recordNewPosition,
} from './create-position'
import {
  inlineOrganisationChecked,
  NewOrganisation,
  ORGANISATION_NAME_TAKEN,
  organisationReward,
  recordNewOrganisation,
} from './create-organisation'
import { OrganisationType } from '../entities/organisation'
import {
  inlinePublicFigureChecked,
  NewPublicFigure,
  PUBLIC_FIGURE_NAME_TAKEN,
  publicFigureReward,
  recordNewPublicFigure,
} from './create-public-figure'
import { ValidatedPublicFigureFields } from './validate-public-figure-fields'
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

/**
 * Who speaks: a personality or an organisation already referenced, or a
 * personality the form opens in the same breath. The two axes stay apart —
 * which kind of author, and existing or to open — so that `StatementAuthor`,
 * which is the domain's own notion, never carries the second.
 */
export type StatementAuthorInput =
  | { kind: 'existing'; author: StatementAuthor }
  | { kind: 'new_figure'; figure: NewPublicFigure }
  | { kind: 'new_organisation'; organisation: NewOrganisation }

/**
 * What the statement is about: a subject, and the position it defends on it —
 * what the form asks under « Sur quoi ? ».
 *
 * The two travel together because they are not independent: a subject created
 * in this same breath has no position to choose from, so its position can
 * only be a new one. Said as two fields, « new subject » and « position I
 * ticked earlier » would be a combination a client could send and the command
 * would have to refuse; said as this union, it cannot be written down.
 */
export type StatementTopic =
  | { kind: 'existing'; subjectId: string; position: StatementPositionInput }
  | { kind: 'new'; subject: NewSubject; position: InlinePosition }

type CreateStatementParams = {
  contributor: ContributorIdentity | null
  author: StatementAuthorInput
  topic: StatementTopic
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

/** What the preconditions settled about the position: one to open, or one chosen */
type SettledPosition =
  | { readonly kind: 'new'; readonly toOpen: { title: string; description: string } }
  | { readonly kind: 'existing'; readonly id: string }

/** The fields of a subject, as its own schema hands them over */
type SubjectFields = { title: string; presentation: string; problem: string }

/** What the preconditions settled about what the statement is about */
type SettledTopic =
  | { readonly kind: 'existing'; readonly subjectId: string; readonly position: SettledPosition }
  | {
      readonly kind: 'new'
      readonly subject: SubjectFields
      readonly position: { title: string; description: string }
    }

/** What the preconditions settled about the author: one to open, or one read */
type SettledAuthor =
  | {
      readonly kind: 'new_figure'
      readonly figure: NewPublicFigure
      readonly fields: ValidatedPublicFigureFields
    }
  | {
      readonly kind: 'new_organisation'
      readonly organisation: NewOrganisation
      readonly organisationType: OrganisationType
    }
  | { readonly kind: 'existing'; readonly author: StatementAuthor }

/** Read side: the author and the position must exist, the position on the subject */
const positions = Effect.serviceFunctions(PositionRepository)
const figures = Effect.serviceFunctions(PublicFigureRepository)
const organisations = Effect.serviceFunctions(OrganisationRepository)

/** The author must exist; the message names what was looked for */
const authorKnown = (
  author: StatementAuthor,
): Effect.Effect<
  void,
  Rejected | DatabaseError,
  PublicFigureRepository | OrganisationRepository
> =>
  author.kind === 'organisation'
    ? Effect.asVoid(
        Effect.flatMap(
          organisations.findById(author.id),
          found('L’organisation sélectionnée est introuvable.'),
        ),
      )
    : Effect.asVoid(
        Effect.flatMap(
          figures.findById(author.id),
          found('La personnalité sélectionnée est introuvable.'),
        ),
      )

/** A position already on the subject: it must exist, and be one of its own */
const positionOnSubject = (subjectId: string, positionId: string) =>
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
const positionSettled = (
  position: StatementPositionInput,
  contributor: ContributorIdentity | null,
  subjectId: string,
) =>
  position.kind === 'new'
    ? pipe(
        allowedTo(contributor, 'add_position', 'proposer une nouvelle position'),
        Effect.andThen(inlinePositionFields(position)),
        Effect.map((toOpen): SettledPosition => ({ kind: 'new', toOpen })),
      )
    : pipe(
        chosenPositionField(subjectId, position.id),
        Effect.andThen(positionOnSubject(subjectId, position.id)),
        Effect.map((): SettledPosition => ({ kind: 'existing', id: position.id })),
      )

/**
 * What the statement will hang on, settled before anything is written: a
 * subject read from the tables with one of its positions, or the fields of a
 * subject and of the first position to open on it.
 *
 * Creating a subject is its own right, and so is proposing a position: a
 * contribution that opens both is asked for both, and the ranks are judged
 * here, before the transaction.
 */
const topicSettled = (topic: StatementTopic, contributor: ContributorIdentity | null) =>
  topic.kind === 'new'
    ? Effect.all({
        subject: inlineSubjectChecked(topic.subject, contributor),
        position: Effect.andThen(
          allowedTo(contributor, 'add_position', 'proposer une nouvelle position'),
          inlinePositionFields(topic.position),
        ),
      }).pipe(
        Effect.map(({ subject, position }): SettledTopic => ({ kind: 'new', subject, position })),
      )
    : Effect.map(
        positionSettled(topic.position, contributor, topic.subjectId),
        (position): SettledTopic => ({ kind: 'existing', subjectId: topic.subjectId, position }),
      )

/**
 * Which author the statement will carry, settled before anything is written:
 * a read from the tables, or the fields of a personality to open. Judging the
 * Wikipedia page is a network call — it happens here, and never inside the
 * transaction, whose seconds are counted.
 */
const authorSettled = (author: StatementAuthorInput, contributor: ContributorIdentity | null) => {
  switch (author.kind) {
    case 'new_figure':
      return Effect.map(
        inlinePublicFigureChecked(author.figure, contributor),
        (fields): SettledAuthor => ({ kind: 'new_figure', figure: author.figure, fields }),
      )
    case 'new_organisation':
      return Effect.map(
        inlineOrganisationChecked(author.organisation, contributor),
        ({ organisationType }): SettledAuthor => ({
          kind: 'new_organisation',
          organisation: author.organisation,
          organisationType,
        }),
      )
    case 'existing':
      return Effect.map(
        authorKnown(author.author),
        (): SettledAuthor => ({ kind: 'existing', author: author.author }),
      )
  }
}

/** The position the statement hangs on: the one opened in this transaction, or the one chosen */
const positionIn = (
  events: EventStore,
  subjectId: string,
  contributorId: string,
  settled: SettledPosition,
) =>
  settled.kind === 'new'
    ? pipe(
        recordNewPosition(events, subjectId, contributorId, settled.toOpen),
        Effect.map((opened) => opened.id),
        uniqueTakenAs('positionTitle', POSITION_TITLE_TAKEN),
      )
    : Effect.succeed(settled.id)

/** What the statement hangs on, once written: the subject's id and the position's */
interface WrittenTopic {
  readonly subjectId: string
  readonly positionId: string
}

/**
 * The subject and the position the statement hangs on: the ones created in
 * this transaction, or the ones read. A subject created here is written
 * first, because its position goes on its stream.
 */
const topicIn = (events: EventStore, contributorId: string, settled: SettledTopic) =>
  settled.kind === 'existing'
    ? Effect.map(
        positionIn(events, settled.subjectId, contributorId, settled.position),
        (positionId): WrittenTopic => ({ subjectId: settled.subjectId, positionId }),
      )
    : pipe(
        recordNewSubject(events, contributorId, settled.subject),
        uniqueTakenAs('subjectTitle', SUBJECT_TITLE_TAKEN),
        Effect.flatMap((subject) =>
          Effect.map(
            positionIn(events, subject.id, contributorId, {
              kind: 'new',
              toOpen: settled.position,
            }),
            (positionId): WrittenTopic => ({ subjectId: subject.id, positionId }),
          ),
        ),
      )

/** What creating the subject and its first position earned, if they were created */
const topicRewards = (contributorId: string, settled: SettledTopic, written: WrittenTopic) =>
  settled.kind === 'new'
    ? [
        subjectReward(contributorId, written.subjectId),
        positionReward(contributorId, written.positionId),
      ]
    : settled.position.kind === 'new'
      ? [positionReward(contributorId, written.positionId)]
      : []

/** The author the statement carries: the one opened here, or the one read */
const authorIn = (events: EventStore, contributorId: string, settled: SettledAuthor) => {
  switch (settled.kind) {
    case 'new_figure':
      return pipe(
        recordNewPublicFigure(events, contributorId, settled.figure, settled.fields),
        Effect.map((figure) => publicFigureAuthor(figure.id)),
        uniqueTakenAs('figureName', PUBLIC_FIGURE_NAME_TAKEN),
      )
    case 'new_organisation':
      return pipe(
        recordNewOrganisation(
          events,
          contributorId,
          settled.organisation,
          settled.organisationType,
        ),
        Effect.map((organisation) => organisationAuthor(organisation.id)),
        uniqueTakenAs('organisationName', ORGANISATION_NAME_TAKEN),
      )
    case 'existing':
      return Effect.succeed(settled.author)
  }
}

/** What opening the author earned, if one was opened at all */
const authorRewards = (contributorId: string, settled: SettledAuthor, writtenId: string) => {
  switch (settled.kind) {
    case 'new_figure':
      return [publicFigureReward(contributorId, writtenId)]
    case 'new_organisation':
      return [organisationReward(contributorId, writtenId)]
    case 'existing':
      return []
  }
}

export function createStatementUseCase(params: CreateStatementParams) {
  const { author, topic, sourceName, sourceUrl, statedAt } = params
  // The command names the statement: the stream exists from its first event
  const id = StatementId.make(crypto.randomUUID())

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_statement', 'ajouter une prise de position'),
      fields: Effect.flatMap(today, (day) =>
        statementFields({ sourceName, sourceUrl, statedAt }, day),
      ),
      content: statementContent(params.content),
      topic: topicSettled(topic, params.contributor),
      author: authorSettled(author, params.contributor),
    }),
    Effect.bind('validated', ({ contributor }) =>
      validateStatementArguments(contributor, params.arguments),
    ),
    /*
     * One transaction for the whole contribution: the proposed arguments open
     * their streams, an opened subject, position and author land on theirs,
     * the statement opens its own, and every reward falls — together, or not
     * at all. Each write that can hit a unique constraint names its own field:
     * one mapping for the whole command would report a position title already
     * taken under the arguments field.
     */
    Effect.flatMap((settled) =>
      runUnitOfWork((events) =>
        pipe(
          recordProposedArguments(events, settled.contributor.id, settled.validated),
          uniqueTakenAs('arguments', ARGUMENT_JUST_CREATED),
          Effect.bindTo('recorded'),
          Effect.bind('topic', () => topicIn(events, settled.contributor.id, settled.topic)),
          Effect.bind('author', () => authorIn(events, settled.contributor.id, settled.author)),
          Effect.flatMap(({ author: writtenAuthor, recorded, topic: writtenTopic }) =>
            pipe(
              openStream(
                statementAggregate,
                events,
                id,
                addStatement({
                  author: writtenAuthor,
                  subjectId: writtenTopic.subjectId,
                  positionId: writtenTopic.positionId,
                  content: settled.content,
                  sourceName: settled.fields.sourceName,
                  sourceUrl: settled.fields.sourceUrl,
                  statedAt: new Date(settled.fields.statedAt),
                  argumentIds: recorded.argumentIds,
                }),
                settled.contributor.id,
              ),
              Effect.tap(() =>
                grantEach(events, settled.contributor.id, [
                  ...authorRewards(settled.contributor.id, settled.author, writtenAuthor.id),
                  ...topicRewards(settled.contributor.id, settled.topic, writtenTopic),
                  rewardFor(settled.contributor.id, 'added_statement_validated', {
                    relatedEntityType: 'statement',
                    relatedEntityId: id,
                  }),
                  ...argumentRewards(settled.contributor.id, recorded),
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
