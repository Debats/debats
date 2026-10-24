import { Statement, StatementAuthor, StatementId, StatementType } from '../entities/statement'
import { StoredEvent, StreamRef } from '../events/event-store'
import { Decoded, replayStream } from './replay'
import { decodeStatementEvent, StatementContent, StatementEvent } from './statement-events'

export const STATEMENT_STREAM = 'statement'

export const statementStream = (id: string): StreamRef => ({
  streamType: STATEMENT_STREAM,
  streamId: id,
})

/** What the journal says a statement is right now */
export interface StatementState {
  statement: Statement
  argumentIds: readonly string[]
  deletedAt: Date | null
}

/** The calendar day of a date, as the events carry it */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

export interface StatementContentInput {
  positionId: string
  statementType: StatementType
  sourceName: string
  sourceUrl?: string
  quote: string
  statedAt: Date
  argumentIds: readonly string[]
}

const content = (input: StatementContentInput): StatementContent => ({
  positionId: input.positionId,
  statementType: input.statementType,
  sourceName: input.sourceName,
  ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
  quote: input.quote,
  statedAt: isoDate(input.statedAt),
  argumentIds: [...input.argumentIds],
})

/** Decision: a contributor adds a statement (its id is chosen by the caller, as the stream's) */
export const addStatement = (
  input: StatementContentInput & { author: StatementAuthor },
): StatementEvent => ({
  type: 'StatementAdded',
  payload: { author: input.author, ...content(input) },
})

/** Decision: a contributor changes what a statement says */
export const editStatement = (input: StatementContentInput): StatementEvent => ({
  type: 'StatementEdited',
  payload: content(input),
})

/** Decision: the statement follows its position, merged into another one */
export const moveStatement = (positionId: string): StatementEvent => ({
  type: 'StatementMoved',
  payload: { positionId },
})

/** Decision: the statement follows its arguments, one of them merged into another */
export const setStatementArguments = (argumentIds: readonly string[]): StatementEvent => ({
  type: 'StatementArgumentsSet',
  payload: { argumentIds: [...argumentIds] },
})

/** The arguments mobilised once `source` is folded into `target`: never the same one twice */
export const withArgumentReplaced = (
  argumentIds: readonly string[],
  source: string,
  target: string,
): string[] => {
  const kept = argumentIds.filter((id) => id !== source)
  return kept.includes(target) ? kept : [...kept, target]
}

/** Decision: the statement goes away with its subject */
export const removeStatement = (): StatementEvent => ({ type: 'StatementDeleted', payload: {} })

/** A statement found in the tables before its journal existed enters it as it is */
export const importStatement = (
  statement: Statement,
  argumentIds: readonly string[],
): StatementEvent => ({
  type: 'StatementImported',
  payload: { author: statement.author, ...content({ ...statement, argumentIds }) },
})

/** Rebuilds the statement from its stream; null for a stream without events */
export const replayStatement = replayStream(decodeStatementEvent, apply)

function apply(
  state: StatementState | null,
  { event, stored }: Decoded<StatementEvent>,
): StatementState | null {
  switch (event.type) {
    case 'StatementAdded':
    case 'StatementImported':
      return {
        statement: Statement.make({
          id: StatementId.make(stored.streamId),
          author: event.payload.author,
          ...asStatementFields(event.payload),
          createdBy: stored.actorId ?? undefined,
          createdAt: stored.occurredAt,
          updatedAt: stored.occurredAt,
        }),
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

function asStatementFields(payload: StatementContent) {
  return {
    positionId: payload.positionId,
    statementType: payload.statementType,
    sourceName: payload.sourceName,
    sourceUrl: payload.sourceUrl,
    quote: payload.quote,
    statedAt: new Date(payload.statedAt),
  }
}
