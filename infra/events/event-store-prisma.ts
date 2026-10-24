import { Effect } from 'effect'
import { Prisma } from '../../prisma/generated/client'
import {
  AppendOptions,
  ConcurrencyError,
  DomainEvent,
  EventStore,
  Revision,
  StoredEvent,
  StreamRef,
} from '../../domain/events/event-store'
import { databaseError } from '../database/database-error'
import { PrismaTransaction } from '../prisma/client'

/** Postgres raises this when the (stream, revision) unique constraint is violated */
const UNIQUE_VIOLATION = 'P2002'

interface EventRow {
  stream_type: string
  stream_id: string
  revision: number
  type: string
  payload: Prisma.JsonValue
  actor_id: string | null
  metadata: Prisma.JsonValue
  occurred_at: Date
}

const toStored = (row: EventRow): StoredEvent => ({
  streamType: row.stream_type,
  streamId: row.stream_id,
  revision: row.revision,
  type: row.type,
  payload: row.payload,
  actorId: row.actor_id,
  metadata: row.metadata as Record<string, unknown>,
  occurredAt: row.occurred_at,
})

const byRevision = (a: StoredEvent, b: StoredEvent) => a.revision - b.revision

/** Whether Postgres refused a row because another one already holds a unique value */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_VIOLATION

/**
 * The journal on the domain_events table, bound to one transaction so that
 * appending and projecting commit or roll back together.
 */
export function createEventStore(tx: PrismaTransaction): EventStore {
  return {
    load: (stream) =>
      Effect.tryPromise({
        try: async () => {
          const rows = await tx.domain_events.findMany({
            where: { stream_type: stream.streamType, stream_id: stream.streamId },
            orderBy: { revision: 'asc' },
          })
          return rows.map(toStored)
        },
        catch: (error) => databaseError('Failed to load the event stream', error),
      }),

    append: (stream, expectedRevision, events, options) =>
      Effect.tryPromise({
        try: () => appendEvents(tx, stream, expectedRevision, events, options),
        catch: (error) =>
          error instanceof ConcurrencyError
            ? error
            : databaseError('Failed to append to the event stream', error),
      }),

    appendToEnd: (stream, events, options) =>
      Effect.tryPromise({
        try: () => appendAfterLast(tx, stream, events, options),
        catch: (error) => databaseError('Failed to append to the end of the event stream', error),
      }),
  }
}

/**
 * Serialises the writers of one stream for the rest of the transaction, so
 * that the revision read next is still the last one when the rows go in.
 * A transaction-scoped lock: it works through a pooler in transaction mode.
 * $executeRaw, as Prisma cannot read the `void` the lock function returns.
 */
async function lockStream(tx: PrismaTransaction, stream: StreamRef): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${stream.streamType}/${stream.streamId}`}))`
}

async function appendAfterLast(
  tx: PrismaTransaction,
  stream: StreamRef,
  events: DomainEvent[],
  options: AppendOptions,
): Promise<StoredEvent[]> {
  if (events.length === 0) return []
  await lockStream(tx, stream)
  const last = await tx.domain_events.aggregate({
    where: { stream_type: stream.streamType, stream_id: stream.streamId },
    _max: { revision: true },
  })
  return appendEvents(tx, stream, last._max.revision ?? 0, events, options)
}

async function appendEvents(
  tx: PrismaTransaction,
  stream: StreamRef,
  expectedRevision: Revision,
  events: DomainEvent[],
  options: AppendOptions,
): Promise<StoredEvent[]> {
  if (events.length === 0) return []

  const rows = events.map((event, index) => ({
    stream_type: stream.streamType,
    stream_id: stream.streamId,
    revision: expectedRevision + index + 1,
    type: event.type,
    payload: event.payload as Prisma.InputJsonValue,
    actor_id: options.actorId,
    metadata: (options.metadata ?? {}) as Prisma.InputJsonValue,
    ...(options.occurredAt ? { occurred_at: options.occurredAt } : {}),
  }))

  try {
    // RETURNING gives no ordering guarantee: put the events back in stream order
    const stored = await tx.domain_events.createManyAndReturn({ data: rows })
    return stored.map(toStored).sort(byRevision)
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConcurrencyError(stream, expectedRevision)
    throw error
  }
}
