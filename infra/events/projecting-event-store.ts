import { Effect } from 'effect'
import { EventStore, StoredEvent, StreamRef, UniqueTaken } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { PrismaTransaction } from '../prisma/client'
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
  ): Effect.Effect<StoredEvent[], E | DatabaseError | UniqueTaken> =>
    Effect.flatMap(projectorsOf(registry, stream.streamType), (projectors) =>
      Effect.flatMap(appended, (stored) => Effect.as(project(projectors, stored, tx), stored)),
    )
  return {
    load: (stream) => store.load(stream),
    append: (stream, expectedRevision, events, options) =>
      projecting(stream, store.append(stream, expectedRevision, events, options)),
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

/** Every event through every projector, in stream order */
function project(
  projectors: readonly Projector[],
  events: StoredEvent[],
  tx: PrismaTransaction,
): Effect.Effect<void, DatabaseError | UniqueTaken> {
  return Effect.forEach(
    events,
    (event) => Effect.forEach(projectors, (projector) => projector(event, tx), { discard: true }),
    { discard: true },
  )
}
