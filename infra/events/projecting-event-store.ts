import { Effect } from 'effect'
import { EventStore, StoredEvent } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { PrismaTransaction } from '../prisma/client'
import { Projector, ProjectorRegistry } from './projectors'

/**
 * The event store a command sees: each append also runs the projectors of
 * the stream type, in the same transaction. Commands never touch the tables.
 */
export function withProjections(
  store: EventStore,
  registry: ProjectorRegistry,
  tx: PrismaTransaction,
): EventStore {
  return {
    load: (stream) => store.load(stream),
    append: (stream, expectedRevision, events, options) =>
      Effect.flatMap(store.append(stream, expectedRevision, events, options), (stored) =>
        Effect.as(project(registry[stream.streamType] ?? [], stored, tx), stored),
      ),
  }
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
