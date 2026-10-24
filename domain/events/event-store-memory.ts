import { Effect } from 'effect'
import {
  AppendOptions,
  ConcurrencyError,
  DomainEvent,
  EventStore,
  StoredEvent,
  StreamRef,
  streamRevision,
} from './event-store'
import { RunUnitOfWork } from './unit-of-work'

export interface InMemoryEventStore extends EventStore {
  /** Every stored event, in order of appending */
  all(): StoredEvent[]
}

const inStream = (stream: StreamRef) => (event: StoredEvent) =>
  event.streamType === stream.streamType && event.streamId === stream.streamId

/**
 * The journal over an array: the same contract as Postgres. Every operation
 * reads the array when it runs, not when the effect is built: a command is
 * described before the streams it needs are imported.
 */
function storeOver(rows: StoredEvent[]): InMemoryEventStore {
  const revisionOf = (stream: StreamRef) => streamRevision(rows.filter(inStream(stream)))
  const push = (
    stream: StreamRef,
    after: number,
    events: DomainEvent[],
    options: AppendOptions,
  ): StoredEvent[] => {
    const stored = events.map((event, index) => ({
      ...event,
      streamType: stream.streamType,
      streamId: stream.streamId,
      revision: after + index + 1,
      actorId: options.actorId,
      metadata: options.metadata ?? {},
      occurredAt: options.occurredAt ?? new Date(),
    }))
    rows.push(...stored)
    return stored
  }
  return {
    all: () => [...rows],
    load: (stream) => Effect.sync(() => rows.filter(inStream(stream))),
    append: (stream, expectedRevision, events, options) =>
      Effect.suspend(() =>
        revisionOf(stream) === expectedRevision
          ? Effect.succeed(push(stream, expectedRevision, events, options))
          : Effect.fail(new ConcurrencyError(stream, expectedRevision)),
      ),
    appendToEnd: (stream, events, options) =>
      Effect.sync(() => push(stream, revisionOf(stream), events, options)),
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
  const run: RunUnitOfWork = (work) =>
    Effect.suspend(() => {
      const mark = rows.length
      return Effect.tapError(work(journal), () => Effect.sync(() => void rows.splice(mark)))
    })
  return { run, journal }
}
