import * as S from 'effect/Schema'
import { Either } from 'effect'
import { STATEMENT_TYPES, StatementAuthor } from '../entities/statement'
import { StoredEvent, UnreadableEvent } from '../events/event-store'

/** A calendar day, as the statement form and the stated_at column carry it */
const IsoDate = S.String.pipe(S.pattern(/^\d{4}-\d{2}-\d{2}$/))

/** What a statement says, in full: every event carries the whole of it */
const StatementContent = S.Struct({
  positionId: S.String,
  statementType: S.Literal(...STATEMENT_TYPES),
  sourceName: S.String,
  sourceUrl: S.optional(S.String),
  quote: S.String,
  statedAt: IsoDate,
  /** The arguments the statement mobilises, by id */
  argumentIds: S.Array(S.String),
})
export type StatementContent = S.Schema.Type<typeof StatementContent>

const StatementAddedPayload = S.Struct({ author: StatementAuthor, ...StatementContent.fields })
export type StatementAddedPayload = S.Schema.Type<typeof StatementAddedPayload>

/** A contributor added the statement */
export const StatementAdded = S.Struct({
  type: S.Literal('StatementAdded'),
  payload: StatementAddedPayload,
})

/** The statement existed before the journal; this is the state it was found in */
export const StatementImported = S.Struct({
  type: S.Literal('StatementImported'),
  payload: StatementAddedPayload,
})

/** A contributor changed what the statement says; the author never changes */
export const StatementEdited = S.Struct({
  type: S.Literal('StatementEdited'),
  payload: StatementContent,
})

export const StatementDeleted = S.Struct({
  type: S.Literal('StatementDeleted'),
  payload: S.Struct({}),
})

export const StatementEvent = S.Union(
  StatementAdded,
  StatementImported,
  StatementEdited,
  StatementDeleted,
)
export type StatementEvent = S.Schema.Type<typeof StatementEvent>

const decode = S.decodeUnknownEither(StatementEvent)

/** Reads a stored event as a statement event, or says why the journal is corrupt */
export function decodeStatementEvent(
  event: StoredEvent,
): Either.Either<StatementEvent, UnreadableEvent> {
  return Either.mapLeft(
    decode({ type: event.type, payload: event.payload }),
    (error) => new UnreadableEvent(event, error.message),
  )
}
