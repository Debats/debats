import { Effect, Either, pipe } from 'effect'
import { StoredEvent, UniqueTaken, UnreadableEvent } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'
import { isUniqueViolation, uniqueConstraintOf } from './event-store-prisma'

/**
 * Keeps one table in step with the events of one stream type. A projector
 * reads only the event, is idempotent, and runs in the transaction that
 * appended the event. Replaying the journal through it rebuilds the table.
 * A value another row holds is a UniqueTaken, for the contributor; anything
 * else that fails is a database error.
 */
export type Projector = (
  event: StoredEvent,
  tx: PrismaTransaction,
) => Effect.Effect<void, DatabaseError | UniqueTaken>

/** Projectors by stream type; an aggregate registers its own when it switches to the journal */
export type ProjectorRegistry = Readonly<Record<string, readonly Projector[]>>

/**
 * A projector over the decoded events of one stream type: the event is read
 * with the aggregate's decoder, then applied to the tables. An unreadable
 * event or a refused write is a database error naming the aggregate.
 */
export function projectorOf<Event>(
  name: string,
  decode: (stored: StoredEvent) => Either.Either<Event, UnreadableEvent>,
  apply: (decoded: Event, stored: StoredEvent, tx: PrismaTransaction) => Promise<unknown>,
): Projector {
  return (event, tx) =>
    pipe(
      decode(event),
      Effect.mapError((unreadable) => databaseError(`Unreadable ${name} event`, unreadable)),
      Effect.flatMap((decoded) =>
        Effect.tryPromise({
          try: () => apply(decoded, event, tx),
          catch: (error) =>
            isUniqueViolation(error)
              ? new UniqueTaken(uniqueConstraintOf(error))
              : databaseError(`Failed to project the ${name}`, error),
        }),
      ),
      Effect.asVoid,
    )
}

/** The actor a row's not-null author column needs; a creation without one is corrupt */
export function actorOf(stored: StoredEvent, what: string): string {
  if (!stored.actorId) throw new Error(`Cannot create ${what} without an actor`)
  return stored.actorId
}

/** The audit columns of a row the event creates: signed and dated as the event */
export function auditOf(stored: StoredEvent, what: string) {
  const actorId = actorOf(stored, what)
  return {
    created_by: actorId,
    updated_by: actorId,
    created_at: stored.occurredAt,
    updated_at: stored.occurredAt,
  }
}
