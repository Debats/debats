import { Either } from 'effect'
import {
  contentLine,
  Statement,
  StatementAuthor,
  StatementContent,
  StatementId,
} from '../entities/statement'
import { StoredEvent, StreamRef } from '../events/event-store'
import { always, Cascade, Decision, refused } from './decision'
import { isoDate } from './iso-date'
import { Decoded, replayStream } from './replay'
import { decodeStatementEvent, StatementEvent, StatementFields } from './statement-events'

export const STATEMENT_STREAM = 'statement'

export const statementStream = (id: string): StreamRef => ({
  streamType: STATEMENT_STREAM,
  streamId: id,
})

/** What the journal says a statement is right now */
export interface StatementState {
  statement: Statement
  /** The subject it stands on; null for a stream opened before the events said it */
  subjectId: string | null
  /** The joint declaration it is a signature of; null for a statement of the author's own */
  jointDeclarationId: string | null
  argumentIds: readonly string[]
  deletedAt: Date | null
}

/** Whether a position may replace the current one: it must be on the subject the stream names */
export const staysOnItsSubject = (state: StatementState, positionSubjectId: string): boolean =>
  state.subjectId === null || state.subjectId === positionSubjectId

export interface StatementRevisionInput {
  positionId: string
  /** What the statement carries, which depends on its nature */
  content: StatementContent
  sourceName: string
  sourceUrl: string
  statedAt: Date
  argumentIds: readonly string[]
}

const fields = (input: StatementRevisionInput): StatementFields => ({
  positionId: input.positionId,
  content: input.content,
  sourceName: input.sourceName,
  sourceUrl: input.sourceUrl,
  statedAt: isoDate(input.statedAt),
  argumentIds: [...input.argumentIds],
})

/* Facts: what the stream records, named in the past tense as the events they are */

export type StatementAddition = StatementRevisionInput & {
  author: StatementAuthor
  subjectId: string
  /** The joint declaration the statement is a signature of, when it is one */
  jointDeclarationId?: string
}

export const statementAdded = (input: StatementAddition) =>
  ({
    type: 'StatementAdded',
    payload: {
      author: input.author,
      subjectId: input.subjectId,
      ...(input.jointDeclarationId ? { jointDeclarationId: input.jointDeclarationId } : {}),
      ...fields(input),
    },
  }) satisfies StatementEvent

export const statementEdited = (input: StatementRevisionInput): StatementEvent => ({
  type: 'StatementEdited',
  payload: fields(input),
})

export const statementMoved = (positionId: string): StatementEvent => ({
  type: 'StatementMoved',
  payload: { positionId },
})

export const statementMovedToSubject = (subjectId: string, positionId: string): StatementEvent => ({
  type: 'StatementMovedToSubject',
  payload: { subjectId, positionId },
})

export const statementArgumentsSet = (argumentIds: readonly string[]): StatementEvent => ({
  type: 'StatementArgumentsSet',
  payload: { argumentIds: [...argumentIds] },
})

export const statementDeleted = (): StatementEvent => ({ type: 'StatementDeleted', payload: {} })

/* Decisions: what a command asks of the statement, decided from its state */

export type StatementDecision = Decision<StatementState, StatementEvent>

/** What another aggregate's command does to the statements it reaches */
export type StatementCascade = Cascade<StatementState, StatementEvent>

export const OTHER_SUBJECT = 'La nouvelle position doit appartenir au même sujet.'
export const SIGNED_JOINTLY =
  'Cette prise de position est la signature d’une déclaration commune : seuls ses arguments se modifient ici.'

/**
 * Whether an edit leaves what the statement says as it is. A signature says
 * what its text says, for every signatory at once: its arguments are the only
 * thing of its own.
 */
const keepsWhatIsSaid = (state: StatementState, input: StatementRevisionInput): boolean => {
  const { statement } = state
  return (
    input.positionId === statement.positionId &&
    input.content.kind === statement.content.kind &&
    contentLine(input.content) === contentLine(statement.content) &&
    input.sourceName === statement.sourceName &&
    input.sourceUrl === statement.sourceUrl &&
    isoDate(input.statedAt) === isoDate(statement.statedAt)
  )
}

/** A contributor adds a statement; its id is the stream's, chosen by the command */
export const addStatement = (input: StatementAddition): StatementEvent[] => [statementAdded(input)]

/**
 * A contributor changes what the statement says; its position may only move
 * within its subject, and a signature only changes its arguments.
 */
export const editStatement =
  (input: StatementRevisionInput, positionSubjectId: string): StatementDecision =>
  (state) => {
    if (state.jointDeclarationId !== null && !keepsWhatIsSaid(state, input))
      return refused(SIGNED_JOINTLY)
    return staysOnItsSubject(state, positionSubjectId)
      ? Either.right([statementEdited(input)])
      : refused(OTHER_SUBJECT, 'positionId')
  }

/** A moderator withdraws the statement, found beyond repair; a live statement has nothing to refuse */
export const withdrawStatement = (): StatementDecision => always(statementDeleted())

/** The statement follows its position, merged into another one */
export const moveStatement =
  (positionId: string): StatementCascade =>
  () => [statementMoved(positionId)]

/**
 * The statement follows its subject, merged into another: `positionAfter`
 * tells, from the position it stands on, the one it stands on there.
 */
export const followSubject =
  (subjectId: string, positionAfter: (positionId: string) => string): StatementCascade =>
  (state) => [statementMovedToSubject(subjectId, positionAfter(state.statement.positionId))]

/** The statement goes away with its subject */
export const removeStatement = (): StatementCascade => () => [statementDeleted()]

/** The statement follows an argument merged into another, when it mobilised it */
export const replaceArgument =
  (sourceArgumentId: string, targetArgumentId: string): StatementCascade =>
  (state) =>
    state.argumentIds.includes(sourceArgumentId)
      ? [
          statementArgumentsSet(
            withArgumentReplaced(state.argumentIds, sourceArgumentId, targetArgumentId),
          ),
        ]
      : []

/** The arguments mobilised once `source` is folded into `target`: never the same one twice */
export const withArgumentReplaced = (
  argumentIds: readonly string[],
  source: string,
  target: string,
): string[] => {
  const kept = argumentIds.filter((id) => id !== source)
  return kept.includes(target) ? kept : [...kept, target]
}

/** Rebuilds the statement from its stream; null for a stream without events */
export const replayStatement = replayStream(decodeStatementEvent, apply)

function apply(
  state: StatementState | null,
  { event, stored }: Decoded<StatementEvent>,
): StatementState | null {
  switch (event.type) {
    case 'StatementAdded':
      return {
        statement: Statement.make({
          id: StatementId.make(stored.streamId),
          author: event.payload.author,
          ...asStatementFields(event.payload),
          createdBy: stored.actorId ?? undefined,
          createdAt: stored.occurredAt,
          updatedAt: stored.occurredAt,
        }),
        subjectId: event.payload.subjectId ?? null,
        jointDeclarationId: event.payload.jointDeclarationId ?? null,
        argumentIds: event.payload.argumentIds,
        deletedAt: null,
      }
    case 'StatementEdited':
      return (
        state && {
          ...state,
          statement: {
            ...state.statement,
            ...asStatementFields(event.payload),
            updatedAt: stored.occurredAt,
          },
          argumentIds: event.payload.argumentIds,
        }
      )
    case 'StatementMoved':
      return (
        state && {
          ...state,
          statement: {
            ...state.statement,
            positionId: event.payload.positionId,
            updatedAt: stored.occurredAt,
          },
        }
      )
    case 'StatementMovedToSubject':
      return (
        state && {
          ...state,
          statement: {
            ...state.statement,
            positionId: event.payload.positionId,
            updatedAt: stored.occurredAt,
          },
          subjectId: event.payload.subjectId,
        }
      )
    case 'StatementArgumentsSet':
      return (
        state && {
          ...state,
          statement: { ...state.statement, updatedAt: stored.occurredAt },
          argumentIds: event.payload.argumentIds,
        }
      )
    case 'StatementDeleted':
      return state && { ...state, deletedAt: stored.occurredAt }
  }
}

function asStatementFields(payload: StatementFields) {
  return {
    positionId: payload.positionId,
    content: payload.content,
    sourceName: payload.sourceName,
    sourceUrl: payload.sourceUrl,
    statedAt: new Date(payload.statedAt),
  }
}
