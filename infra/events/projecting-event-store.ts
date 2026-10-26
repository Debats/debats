import { Effect } from 'effect'
import { EventStore, StoredEvent, StreamRef, UniqueTaken } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { PrismaTransaction } from '../prisma/client'
import { Projector, ProjectorRegistry } from './projector'

/**
 * The event store a command sees: each append also runs the projector of
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
  ): Effect.Effect<StoredEvent[], E | DatabaseError | UniqueTaken> =>
    Effect.flatMap(projectorOf(registry, stream.streamType), (projector) =>
      Effect.flatMap(appended, (stored) => Effect.as(project(projector, stored, tx), stored)),
    )
  return {
    load: (stream) => store.load(stream),
    append: (stream, expectedRevision, events, options) =>
      projecting(stream, store.append(stream, expectedRevision, events, options)),
    appendToEnd: (stream, events, options) =>
      projecting(stream, store.appendToEnd(stream, events, options)),
  }
}

function projectorOf(registry: ProjectorRegistry, streamType: string): Effect.Effect<Projector> {
  const projector = registry[streamType]
  return projector
    ? Effect.succeed(projector)
    : Effect.dieMessage(`No projector is registered for the ${streamType} stream`)
}

/** Every event through the projector, in stream order */
function project(
  projector: Projector,
  events: StoredEvent[],
  tx: PrismaTransaction,
): Effect.Effect<void, DatabaseError | UniqueTaken> {
  return Effect.forEach(events, (event) => projector(event, tx), { discard: true })
}
