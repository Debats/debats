import { describe, it, expect } from 'vitest'
import { Context, Effect, Either, pipe } from 'effect'
import { ConcurrencyError } from '../events/event-store'
import { createInMemoryEventStore, inMemoryUnitOfWork } from '../events/event-store-memory'
import { RunUnitOfWork, UnitOfWork } from '../events/unit-of-work'
import {
  AggregateStream,
  decideOn,
  ensureStream,
  IMPORT,
  loadStream,
  Source,
} from './aggregate-stream'
import { NotFound, Rejected } from './types'

/** A counter: the smallest aggregate that can be opened, moved and closed */
interface Counter {
  count: number
  closed: boolean
}

type CounterEvent =
  | { type: 'Opened'; payload: { count: number } }
  | { type: 'Moved'; payload: { by: number } }
  | { type: 'Closed'; payload: Record<string, never> }

/** What a table would hold of a counter */
interface CounterRow {
  count: number
  openedAt: Date
}

const CounterSource = Context.GenericTag<Source<CounterRow>>('CounterSource')

const counterAggregate: AggregateStream<Counter, CounterEvent, CounterRow> = {
  streamType: 'counter',
  notFound: 'Le compteur est introuvable.',
  source: CounterSource,
  replay: (events) =>
    Either.right(
      events.reduce<Counter | null>((state, stored) => {
        switch (stored.type) {
          case 'Opened':
            return { count: (stored.payload as { count: number }).count, closed: false }
          case 'Moved':
            return state && { ...state, count: state.count + (stored.payload as { by: number }).by }
          case 'Closed':
            return state && { ...state, closed: true }
          default:
            return state
        }
      }, null),
    ),
  isLive: (state) => !state.closed,
  importBatches: (row) => [
    {
      events: [opened(row.count)],
      options: { actorId: null, metadata: IMPORT, occurredAt: row.openedAt },
    },
  ],
}

const id = 'counter-1'
const stream = { streamType: 'counter', streamId: id }
const nothing = () => Effect.succeed(null)
const rowOf = (row: CounterRow) => () => Effect.succeed(row)

function opened(count: number): CounterEvent {
  return { type: 'Opened', payload: { count } }
}
const moved = (by: number): CounterEvent => ({ type: 'Moved', payload: { by } })
const closed: CounterEvent = { type: 'Closed', payload: {} }

const openedAt = new Date('2024-01-10T10:00:00Z')

/** The stream ensured against the given unit of work and tables */
const ensured = (run: RunUnitOfWork, source: Source<CounterRow>) =>
  pipe(
    ensureStream(counterAggregate, id),
    Effect.provideService(UnitOfWork, run),
    Effect.provideService(CounterSource, source),
  )

describe('ensureStream', () => {
  it('leaves a stream that has events alone, without asking the tables', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    await Effect.runPromise(journal.append(stream, 0, [opened(1), moved(2)], { actorId: 'alice' }))
    let asked = 0
    const source = () => Effect.sync(() => void asked++).pipe(Effect.as(null))

    await Effect.runPromise(ensured(run, source))

    expect(journal.all().map((e) => e.type)).toEqual(['Opened', 'Moved'])
    expect(asked).toBe(0)
  })

  it('imports the aggregate from the tables when its stream is empty, dated and marked', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    await Effect.runPromise(ensured(run, rowOf({ count: 7, openedAt })))

    expect(journal.all()).toMatchObject([
      { streamId: id, revision: 1, type: 'Opened', payload: { count: 7 }, metadata: IMPORT },
    ])
    expect(journal.all()[0].occurredAt).toEqual(openedAt)
  })

  it('refuses when neither the journal nor the tables know the aggregate', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const outcome = await Effect.runPromise(Effect.either(ensured(run, nothing)))

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new NotFound('Le compteur est introuvable.'),
    )
    expect(journal.all()).toEqual([])
  })

  it('is content with a stream another command imported meanwhile', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    // The tables are read after the check: the other command slips in there
    const source = () =>
      Effect.orDie(
        Effect.map(
          journal.append(stream, 0, [opened(3)], { actorId: null, metadata: IMPORT }),
          () => ({ count: 7, openedAt }),
        ),
      )

    await Effect.runPromise(ensured(run, source))

    expect(journal.all().map((e) => [e.revision, e.payload])).toEqual([[1, { count: 3 }]])
  })
})

describe('loadStream', () => {
  it('refuses a stream nobody ensured', async () => {
    const events = createInMemoryEventStore()

    const outcome = await Effect.runPromise(Effect.either(loadStream(counterAggregate, events, id)))

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new NotFound('Le compteur est introuvable.'),
    )
  })
})

describe('decideOn', () => {
  it('appends the decision after the history, rebuilds the state and tells the revision', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const decided = await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', (current) =>
        Either.right([moved(current.count + 10)]),
      ),
    )

    expect(decided).toEqual({ state: { count: 12, closed: false }, revision: 2 })
    expect(events.all().map((e) => [e.revision, e.type, e.actorId])).toEqual([
      [1, 'Opened', 'alice'],
      [2, 'Moved', 'bob'],
    ])
  })

  it('refuses a decision rendered from a revision the stream has moved past', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1), moved(2)], { actorId: 'alice' }))

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, 'bob', () => Either.right([moved(1)]), 1),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toBeInstanceOf(ConcurrencyError)
    expect(events.all()).toHaveLength(2)
  })

  it('accepts a decision rendered from the current revision, or from no stream at all', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', () => Either.right([moved(1)]), 1),
    )
    // Zero: the page found no stream yet (imported since), nothing to compare
    await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', () => Either.right([moved(1)]), 0),
    )

    expect(events.all()).toHaveLength(3)
  })

  it('writes nothing when the decision changes nothing', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const decided = await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', () => Either.right([])),
    )

    expect(decided).toEqual({ state: { count: 1, closed: false }, revision: 1 })
    expect(events.all()).toHaveLength(1)
  })

  it('refuses a deleted aggregate as unknown, before any decision', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1), closed], { actorId: 'alice' }))
    let decided = 0

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, 'bob', () => {
          decided++
          return Either.right([moved(1)])
        }),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new NotFound('Le compteur est introuvable.'),
    )
    expect(decided).toBe(0)
    expect(events.all()).toHaveLength(2)
  })

  it('lets the decision refuse, writing nothing', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, 'bob', () =>
          Either.left(new Rejected('Trop haut.', 'count')),
        ),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(new Rejected('Trop haut.', 'count'))
    expect(events.all()).toHaveLength(1)
  })
})
