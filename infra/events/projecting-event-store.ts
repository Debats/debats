import { Effect, pipe } from 'effect'
import {
  ConcurrencyError,
  EventStore,
  Revision,
  StoredEvent,
  StreamRef,
} from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { PrismaTransaction } from '../prisma/client'
import { isUniqueViolation } from './event-store-prisma'
import { Projector, ProjectorRegistry } from './projector'

/**
 * The event store a command sees: each append also runs the projectors of
 * the stream type, in the same transaction. Commands never touch the tables.
 * A stream type nobody registered is a defect: its tables would silently
 * fall behind the journal.
 */
export function withProjections(
  store: EventStore,
  registry: ProjectorRegistry,
  tx: PrismaTransaction,
): EventStore {
  const projecting = <E>(
    stream: StreamRef,
    appended: Effect.Effect<StoredEvent[], E>,
  ): Effect.Effect<StoredEvent[], E | DatabaseError> =>
    Effect.flatMap(projectorsOf(registry, stream.streamType), (projectors) =>
      Effect.flatMap(appended, (stored) => Effect.as(project(projectors, stored, tx), stored)),
    )
  return {
    load: (stream) => store.load(stream),
    append: (stream, expectedRevision, events, options) =>
      pipe(
        projecting(stream, store.append(stream, expectedRevision, events, options)),
        Effect.mapError(raceOn(stream, expectedRevision)),
      ),
    appendToEnd: (stream, events, options) =>
      projecting(stream, store.appendToEnd(stream, events, options)),
  }
}

function projectorsOf(
  registry: ProjectorRegistry,
  streamType: string,
): Effect.Effect<readonly Projector[]> {
  const projectors = registry[streamType]
  return projectors
    ? Effect.succeed(projectors)
    : Effect.dieMessage(`No projector is registered for the ${streamType} stream`)
}

/**
 * A projector refused by a unique constraint lost a race: another command
 * took the title or the slug between the command's check and the write.
 * The writer must look again, as after a stale revision; anything else
 * stays a defect. The store itself never reports its own unique constraint
 * this way: a stale revision is already a ConcurrencyError.
 */
const raceOn =
  (stream: StreamRef, expectedRevision: Revision) =>
  (error: DatabaseError | ConcurrencyError): DatabaseError | ConcurrencyError =>
    error instanceof DatabaseError && isUniqueViolation(error.cause)
      ? new ConcurrencyError(stream, expectedRevision)
      : error

/** Every event through every projector, in stream order */
function project(
  projectors: readonly Projector[],
  events: StoredEvent[],
  tx: PrismaTransaction,
): Effect.Effect<void, DatabaseError> {
  return Effect.forEach(
    events,
    (event) => Effect.forEach(projectors, (projector) => projector(event, tx), { discard: true }),
    { discard: true },
  )
}
