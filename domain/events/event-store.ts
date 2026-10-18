import { Effect } from 'effect'
import { DatabaseError } from '../repositories/errors'

/** A fact that happened to an aggregate, named in the past tense */
export interface DomainEvent<Type extends string = string, Payload = unknown> {
  type: Type
  payload: Payload
}

/** An event as stored, with the revision of the aggregate it produced */
export interface StoredEvent<Type extends string = string, Payload = unknown> extends DomainEvent<
  Type,
  Payload
> {
  streamType: string
  streamId: string
  revision: number
  actorId: string | null
  metadata: Record<string, unknown>
  occurredAt: Date
}

/** One aggregate's stream: its type (« statement », « subject »…) and its id */
export interface StreamRef {
  streamType: string
  streamId: string
}

/**
 * The revision of the aggregate: how many events its stream holds. Each event
 * produces the next one, starting at 1; 0 is a stream that does not exist yet.
 * Not to be confused with the schema version of a payload, handled on decoding.
 */
export type Revision = number

/** Two writers raced on the same stream: the second must reload and decide again */
export class ConcurrencyError extends Error {
  readonly _tag = 'ConcurrencyError'
  constructor(
    readonly stream: StreamRef,
    readonly expectedRevision: Revision,
  ) {
    super(`Stream ${stream.streamType}/${stream.streamId} moved past revision ${expectedRevision}`)
  }
}

export interface AppendOptions {
  actorId: string | null
  metadata?: Record<string, unknown>
}

/**
 * The journal of what happened. A command receives it from the unit of work
 * (infra/events/unit-of-work.ts): appending is atomic with the projections
 * the events drive, in the same transaction.
 */
export interface EventStore {
  /** Every event of a stream, oldest first; empty for an unknown stream */
  load(stream: StreamRef): Effect.Effect<StoredEvent[], DatabaseError>

  /**
   * Appends events after `expectedRevision`, the revision the writer decided
   * from, numbering them from there. Fails with ConcurrencyError when the
   * stream has moved past it.
   */
  append(
    stream: StreamRef,
    expectedRevision: Revision,
    events: DomainEvent[],
    options: AppendOptions,
  ): Effect.Effect<StoredEvent[], DatabaseError | ConcurrencyError>
}

/** The revision a stream is at after these events; 0 for none */
export const streamRevision = (events: StoredEvent[]): Revision =>
  events.length === 0 ? 0 : events[events.length - 1].revision
