import { Effect } from 'effect'
import { EventStore, StoredEvent } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { PrismaTransaction } from '../prisma/client'
import { Projector, ProjectorRegistry } from './projectors'

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
  return {
    load: (stream) => store.load(stream),
    append: (stream, expectedRevision, events, options) =>
      Effect.flatMap(projectorsOf(registry, stream.streamType), (projectors) =>
        Effect.flatMap(store.append(stream, expectedRevision, events, options), (stored) =>
          Effect.as(project(projectors, stored, tx), stored),
        ),
      ),
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
): Effect.Effect<void, DatabaseError> {
  return Effect.forEach(
    events,
    (event) => Effect.forEach(projectors, (projector) => projector(event, tx), { discard: true }),
    { discard: true },
  )
}
