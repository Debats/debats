import { AppendOptions, EventStore } from './event-store'

/**
 * The journal as a transaction hands it out: every fact written through it
 * bears the instant the command was taken on, so a single command never
 * writes two facts on two instants — its deed and the reputation it earns
 * are dated alike. A writer that knows better still says when: a backfill
 * replaying the facts of another day gives its own `occurredAt`, and keeps it.
 */
export const withDate = (events: EventStore, happenedAt: Date): EventStore => {
  const when = (options: AppendOptions): AppendOptions => ({
    ...options,
    occurredAt: options.occurredAt ?? happenedAt,
  })
  return {
    load: (stream) => events.load(stream),
    append: (stream, expectedRevision, decided, options) =>
      events.append(stream, expectedRevision, decided, when(options)),
    appendToEnd: (stream, decided, options) => events.appendToEnd(stream, decided, when(options)),
  }
}
