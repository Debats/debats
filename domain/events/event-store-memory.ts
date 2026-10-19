import { Effect } from 'effect'
import { ConcurrencyError, EventStore, StoredEvent, StreamRef, streamRevision } from './event-store'
import { RunUnitOfWork } from './unit-of-work'

export interface InMemoryEventStore extends EventStore {
  /** Every stored event, in order of appending */
  all(): StoredEvent[]
}

const inStream = (stream: StreamRef) => (event: StoredEvent) =>
  event.streamType === stream.streamType && event.streamId === stream.streamId

/** The journal over an array: the same contract as Postgres */
function storeOver(rows: StoredEvent[]): InMemoryEventStore {
  return {
    all: () => [...rows],
    load: (stream) => Effect.succeed(rows.filter(inStream(stream))),
    append: (stream, expectedRevision, events, options) => {
      if (streamRevision(rows.filter(inStream(stream))) !== expectedRevision) {
        return Effect.fail(new ConcurrencyError(stream, expectedRevision))
      }
      const stored = events.map((event, index) => ({
        ...event,
        streamType: stream.streamType,
        streamId: stream.streamId,
        revision: expectedRevision + index + 1,
        actorId: options.actorId,
        metadata: options.metadata ?? {},
        occurredAt: options.occurredAt ?? new Date(),
      }))
      rows.push(...stored)
      return Effect.succeed(stored)
    },
  }
}

/** The journal in memory, for tests and replays */
export function createInMemoryEventStore(): InMemoryEventStore {
  return storeOver([])
}

/** A unit of work over an in-memory journal; a failing command leaves no event behind */
export function inMemoryUnitOfWork(): { run: RunUnitOfWork; journal: InMemoryEventStore } {
  const rows: StoredEvent[] = []
  const journal = storeOver(rows)
  const run: RunUnitOfWork = (work) => {
    const mark = rows.length
    return Effect.tapError(work(journal), () => Effect.sync(() => void rows.splice(mark)))
  }
  return { run, journal }
}
